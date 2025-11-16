# backend/sistema.py
import threading
import math
import random
import time
from typing import List, Optional, Tuple, Dict

# ----------------- Lugares simbólicos para la "ciudad" -----------------

LOCACIONES: Dict[str, Tuple[float, float]] = {
    "Retiro": (1.0, 1.0),
    "Centro": (2.0, 2.0),
    "Aeropuerto": (5.0, 1.0),
    "Universidad": (3.0, 4.0),
    "Estación Norte": (4.0, 3.0),
}


# ----------------- Clases Taxi y Cliente -----------------


class Taxi:
    def __init__(self, id_: int, x: float, y: float, rating: int = 5) -> None:
        self.id: int = id_
        self.x: float = x
        self.y: float = y
        self.rating: int = rating

        # Estado de ocupación
        self.ocupado: bool = False

        # Datos económicos simulados
        self.total_bruto: float = 0.0      # facturación antes de comisión
        self.total_neto: float = 0.0       # dinero que se queda el taxista
        self.total_comision: float = 0.0   # dinero pagado a UNIETAXI
        self.viajes_realizados: int = 0    # número de viajes


class Cliente:
    def __init__(self, id_: int, x: float, y: float) -> None:
        self.id: int = id_
        self.x: float = x
        self.y: float = y

        self.taxi_asignado: Optional[Taxi] = None
        self.sem_asignacion = threading.Semaphore(0)


# ----------------- MONITOR DEL SISTEMA DE ATENCIÓN -----------------


class SistemaAtencion:
    """
    MONITOR DEL SISTEMA UNIETAXI

    - Mantiene taxis, clientes, solicitudes y viajes.
    - Usa un hilo de atención para las solicitudes clásicas.
    - Usa un hilo de simulación para que los viajes "avancen en el tiempo":
      * los viajes van consumiendo tiempo_restante
      * cuando llega a 0 → viaje finalizado → taxi vuelve a estar libre.
    """

    def __init__(self) -> None:
        # Recursos críticos
        self._taxis: List[Taxi] = []
        self._clientes: List[Cliente] = []
        self._cola_solicitudes: List[Cliente] = []
        self._asignaciones: List[Tuple[int, int]] = []  # (id_cliente, id_taxi)

        # Historial de viajes "tipo Uber"
        self._historial_viajes: List[dict] = []
        self._contador_viajes: int = 0

        # Sincronización
        self._lock = threading.Lock()
        self._sem_solicitudes = threading.Semaphore(0)

        # Control de hilos
        self._detener = False
        self._hilo_atencion = threading.Thread(
            target=self._bucle_atencion,
            daemon=True,
            name="HiloSistemaAtencion",
        )
        self._hilo_simulacion = threading.Thread(
            target=self._bucle_simulacion,
            daemon=True,
            name="HiloSimulacionViajes",
        )

    # ------------------------------------------------------------------
    # Gestión general
    # ------------------------------------------------------------------

    def iniciar(self) -> None:
        """Arranca los hilos internos del sistema."""
        self._hilo_atencion.start()
        self._hilo_simulacion.start()

    def detener(self) -> None:
        self._detener = True
        self._sem_solicitudes.release()
        self._hilo_atencion.join(timeout=2)
        self._hilo_simulacion.join(timeout=2)

    def registrar_taxi(self, taxi: Taxi) -> None:
        with self._lock:
            self._taxis.append(taxi)

    def registrar_cliente(self, cliente: Cliente) -> None:
        with self._lock:
            self._clientes.append(cliente)

    def solicitar_taxi(self, cliente: Cliente) -> None:
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    # ------------------------------------------------------------------
    # Hilo de atención (para solicitudes clásicas x,y)
    # ------------------------------------------------------------------

    def _bucle_atencion(self) -> None:
        while not self._detener:
            self._sem_solicitudes.acquire()
            if self._detener:
                break

            cliente = self._obtener_siguiente_solicitud()
            if cliente is None:
                continue

            taxi = self._seleccionar_taxi_para(cliente)
            if taxi is not None:
                with self._lock:
                    self._asignaciones.append((cliente.id, taxi.id))
                cliente.taxi_asignado = taxi

            cliente.sem_asignacion.release()

    def _obtener_siguiente_solicitud(self) -> Optional[Cliente]:
        with self._lock:
            if not self._cola_solicitudes:
                return None
            return self._cola_solicitudes.pop(0)

    # ------------------------------------------------------------------
    # Selección de taxi (por cliente o por posición)
    # ------------------------------------------------------------------

    def _seleccionar_taxi_para(self, cliente: Cliente) -> Optional[Taxi]:
        with self._lock:
            taxis_libres = [t for t in self._taxis if not t.ocupado]
            if not taxis_libres:
                return None

            def distancia(t: Taxi) -> float:
                dx = t.x - cliente.x
                dy = t.y - cliente.y
                return math.hypot(dx, dy)

            candidatos = [t for t in taxis_libres if distancia(t) <= 2.0]
            if not candidatos:
                candidatos = taxis_libres

            candidatos.sort(key=lambda t: (distancia(t), -t.rating))
            taxi_elegido = candidatos[0]
            taxi_elegido.ocupado = True
            return taxi_elegido

    def _seleccionar_taxi_para_posicion(self, x: float, y: float) -> Optional[Taxi]:
        with self._lock:
            taxis_libres = [t for t in self._taxis if not t.ocupado]
            if not taxis_libres:
                return None

            def distancia(t: Taxi) -> float:
                dx = t.x - x
                dy = t.y - y
                return math.hypot(dx, dy)

            candidatos = [t for t in taxis_libres if distancia(t) <= 2.0]
            if not candidatos:
                candidatos = taxis_libres

            candidatos.sort(key=lambda t: (distancia(t), -t.rating))
            taxi_elegido = candidatos[0]
            return taxi_elegido

    # ------------------------------------------------------------------
    # Viajes "tipo Uber"
    # ------------------------------------------------------------------

    def crear_viaje_desde_lugares(self, origen: str, destino: str) -> dict:
        """
        Crea un viaje 'a lo Uber' desde dos lugares simbólicos.

        - Si hay taxis libres → asigna uno, crea viaje pendiente y deja el taxi ocupado.
        - Si no hay taxis libres → devuelve tiempo de espera estimado, sin crear viaje.
        """
        if origen not in LOCACIONES or destino not in LOCACIONES:
            return {
                "ok": False,
                "motivo": "lugares_invalidos",
                "mensaje": "Origen o destino no válidos.",
            }

        ox, oy = LOCACIONES[origen]
        dx, dy = LOCACIONES[destino]

        taxi = self._seleccionar_taxi_para_posicion(ox, oy)
        if taxi is None:
            # Simulación simple: si no hay taxis, decimos "20 min de espera"
            return {
                "ok": False,
                "motivo": "sin_taxis",
                "mensaje": "No hay taxis libres. Aproximadamente en 20 minutos habrá uno disponible.",
                "tiempo_espera_min": 20,
            }

        # Calcular distancia, tarifa y duración simulada
        distancia = math.hypot(dx - ox, dy - oy)
        tarifa_base = 3.0
        tarifa_km = 2.0
        tarifa = round(tarifa_base + tarifa_km * distancia, 2)
        duracion_min = round(max(3, distancia * 4), 1)

        with self._lock:
            self._contador_viajes += 1
            id_viaje = self._contador_viajes

            viaje = {
                "id_viaje": id_viaje,
                "estado": "pendiente",  # pendiente → aceptado → finalizado / cancelado
                "origen": origen,
                "destino": destino,
                "taxi_id": taxi.id,
                "rating_taxi": taxi.rating,
                "distancia_aprox_km": round(distancia, 2),
                "tarifa": tarifa,
                "duracion_min": duracion_min,
                # tiempo_restante en "minutos simulados"
                "tiempo_restante": int(duracion_min),
            }

            taxi.ocupado = True
            taxi.total_bruto += tarifa
            taxi.viajes_realizados += 1

            self._historial_viajes.append(viaje)

        return {"ok": True, **viaje}

    def aceptar_viaje(self, id_viaje: int) -> bool:
        with self._lock:
            for v in self._historial_viajes:
                if v["id_viaje"] == id_viaje:
                    if v["estado"] != "pendiente":
                        return False
                    v["estado"] = "aceptado"
                    return True
        return False

    def finalizar_viaje(self, id_viaje: int) -> bool:
        """
        Marca el viaje como finalizado y libera el taxi.
        """
        with self._lock:
            viaje = None
            for v in self._historial_viajes:
                if v["id_viaje"] == id_viaje:
                    viaje = v
                    break

            if viaje is None:
                return False

            if viaje["estado"] == "finalizado":
                return False

            viaje["estado"] = "finalizado"

            taxi_id = viaje["taxi_id"]
            for t in self._taxis:
                if t.id == taxi_id:
                    t.ocupado = False
                    break

            return True

    def cancelar_viaje(self, id_viaje: int) -> bool:
        """
        El pasajero rechaza/cancela el viaje.
        Si el taxi estaba ocupado por este viaje, se libera.
        """
        with self._lock:
            viaje = None
            for v in self._historial_viajes:
                if v["id_viaje"] == id_viaje:
                    viaje = v
                    break

            if viaje is None:
                return False

            if viaje["estado"] in ("finalizado", "cancelado"):
                return False

            viaje["estado"] = "cancelado"

            taxi_id = viaje["taxi_id"]
            for t in self._taxis:
                if t.id == taxi_id:
                    t.ocupado = False
                    break

            return True

    # ------------------------------------------------------------------
    # Hilo de simulación: avanza viajes y libera taxis
    # ------------------------------------------------------------------

    def _bucle_simulacion(self) -> None:
    #    """
    #    Hilo que simula el paso del tiempo para los viajes.

    #    Cada 5 segundos de tiempo real:
    #   - Reduce tiempo_restante de viajes pendientes/aceptados.
    #    - Cuando llega a 0 → finaliza el viaje y libera taxi.
     #   
        while not self._detener:
            time.sleep(5.0)
            with self._lock:
                for v in self._historial_viajes:
                    if v["estado"] in ("pendiente", "aceptado") and v.get("tiempo_restante") is not None:
                        if v["tiempo_restante"] > 0:
                            v["tiempo_restante"] -= 1
                            print(
                                f"[SIM] Viaje {v['id_viaje']} → tiempo_restante = {v['tiempo_restante']}"
                            )
                        if v["tiempo_restante"] <= 0 and v["estado"] != "finalizado":
                            v["estado"] = "finalizado"
                            taxi_id = v["taxi_id"]
                            for t in self._taxis:
                                if t.id == taxi_id:
                                    t.ocupado = False
                                    print(
                                        f"[SIM] Viaje {v['id_viaje']} finalizado. Taxi {taxi_id} vuelve a estar LIBRE."
                                    )
                                    break


    # ------------------------------------------------------------------
    # Cierre contable
    # ------------------------------------------------------------------

    def cierre_contable(self) -> None:
        with self._lock:
            for t in self._taxis:
                if t.total_bruto <= 0:
                    continue
                comision = round(t.total_bruto * 0.20, 2)
                neto = round(t.total_bruto - comision, 2)
                t.total_comision += comision
                t.total_neto += neto
                t.total_bruto = 0.0

    # ------------------------------------------------------------------
    # Snapshots
    # ------------------------------------------------------------------

    def snapshot_asignaciones(self) -> List[Tuple[int, int]]:
        with self._lock:
            return list(self._asignaciones)

    def snapshot_taxis(self) -> List[dict]:
        with self._lock:
            return [
                {
                    "id": t.id,
                    "x": t.x,
                    "y": t.y,
                    "rating": t.rating,
                    "ocupado": t.ocupado,
                    "total_bruto": t.total_bruto,
                    "total_neto": t.total_neto,
                    "total_comision": t.total_comision,
                    "viajes_realizados": t.viajes_realizados,
                }
                for t in self._taxis
            ]

    def snapshot_clientes(self) -> List[dict]:
        with self._lock:
            return [
                {
                    "id": c.id,
                    "x": c.x,
                    "y": c.y,
                    "tiene_taxi": c.taxi_asignado is not None,
                    "taxi_id": c.taxi_asignado.id if c.taxi_asignado else None,
                }
                for c in self._clientes
            ]

    def snapshot_viajes(self) -> List[dict]:
        with self._lock:
            return [dict(v) for v in self._historial_viajes]

    def snapshot_estado(self) -> dict:
        return {
            "taxis": self.snapshot_taxis(),
            "clientes": self.snapshot_clientes(),
            "asignaciones": self.snapshot_asignaciones(),
            "viajes": self.snapshot_viajes(),
        }
