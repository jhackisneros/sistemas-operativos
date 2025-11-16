# backend/sistema.py
import threading
import math
import time
from typing import List, Optional, Tuple, Dict

# ----------------- Lugares simbólicos -----------------

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
        # rating medio del taxi (se irá actualizando con las valoraciones)
        self.rating: float = float(rating)

        # Estado de ocupación
        self.ocupado: bool = False

        # Datos económicos simulados
        self.total_bruto: float = 0.0      # facturación antes de comisión
        self.total_neto: float = 0.0       # dinero que se queda el taxista
        self.total_comision: float = 0.0   # dinero pagado a UNIETAXI
        self.viajes_realizados: int = 0    # número de viajes

        # Para calcular rating promedio (media de estrellas)
        self.total_valoraciones: int = 0
        self.suma_valoraciones: int = 0


class Cliente:
    def __init__(self, id_: int, x: float, y: float) -> None:
        self.id: int = id_
        self.x: float = x
        self.y: float = y

        self.taxi_asignado: Optional[Taxi] = None
        # Semáforo para el caso de asignación "clásica"
        self.sem_asignacion = threading.Semaphore(0)


# ----------------- MONITOR DEL SISTEMA DE ATENCIÓN -----------------


class SistemaAtencion:
    """
    Monitor principal del sistema UNIETAXI.

    - Gestiona taxis, clientes, asignaciones y viajes.
    - Hilo de atención: procesa peticiones clásicas.
    - Hilo de simulación:
        * hace avanzar el tiempo de los viajes
        * libera taxis al terminar
        * cada “día simulado” aplica el cierre contable (20%).
    """

    def __init__(self) -> None:
        # Recursos críticos
        self._taxis: List[Taxi] = []
        self._clientes: List[Cliente] = []
        self._cola_solicitudes: List[Cliente] = []
        self._asignaciones: List[Tuple[int, int]] = []

        # Historial de viajes "tipo Uber"
        self._historial_viajes: List[dict] = []
        self._contador_viajes: int = 0

        # Sincronización
        self._lock = threading.Lock()
        self._sem_solicitudes = threading.Semaphore(0)

        # Hilos internos
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

        # Reloj simulado
        self._minutos_simulados: int = 0
        self._dias_simulados: int = 0

    # ------------------------------------------------------------------
    # Gestión general
    # ------------------------------------------------------------------

    def iniciar(self) -> None:
        """Arranca los hilos internos del monitor."""
        self._hilo_atencion.start()
        self._hilo_simulacion.start()

    def detener(self) -> None:
        """Detiene los hilos (para pruebas)."""
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
        """
        Versión clásica: el cliente se encola y el hilo de atención asigna taxi.
        (Esta parte la puedes comentar en el informe como uso de semáforo + monitor)
        """
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    # ------------------------------------------------------------------
    # Hilo de atención (cola de solicitudes)
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
    # Selección de taxi
    # ------------------------------------------------------------------

    def _seleccionar_taxi_para(self, cliente: Cliente) -> Optional[Taxi]:
        """Selecciona taxi basándose en la posición del cliente."""
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
        """Versión para las coordenadas de los lugares simbólicos."""
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

        - Si hay taxis libres → asigna uno, deja taxi ocupado y crea viaje.
        - Si no hay taxis libres → devuelve tiempo de espera estimado.
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
            # Caso: no hay taxis libres
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
                # rating del cliente (se rellenará cuando valore)
                "rating_cliente": None,
            }

            taxi.ocupado = True
            taxi.total_bruto += tarifa
            taxi.viajes_realizados += 1

            self._historial_viajes.append(viaje)

        return {"ok": True, **viaje}

    def aceptar_viaje(self, id_viaje: int) -> bool:
        """El taxista acepta un viaje pendiente."""
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
        (el hilo de simulación también lo hace cuando tiempo_restante llega a 0)
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
        El pasajero cancela el viaje; si el taxi estaba ocupado por este viaje,
        se vuelve a liberar.
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

    def calificar_viaje(self, id_viaje: int, estrellas: int) -> bool:
        """
        Guarda la valoración del cliente (1–5 estrellas) y actualiza
        el rating promedio del taxi.
        """
        if estrellas < 1 or estrellas > 5:
            return False

        with self._lock:
            viaje = None
            for v in self._historial_viajes:
                if v["id_viaje"] == id_viaje:
                    viaje = v
                    break

            if viaje is None:
                return False

            taxi_id = viaje["taxi_id"]
            taxi = None
            for t in self._taxis:
                if t.id == taxi_id:
                    taxi = t
                    break

            if taxi is None:
                return False

            # Guardamos rating del cliente en el viaje
            viaje["rating_cliente"] = estrellas

            # Actualizamos estadísticas del taxi
            taxi.total_valoraciones += 1
            taxi.suma_valoraciones += estrellas
            taxi.rating = round(
                taxi.suma_valoraciones / taxi.total_valoraciones, 1
            )

            print(
                f"[RATING] Taxi {taxi.id}: nueva valoración {estrellas}⭐ → rating medio {taxi.rating}"
            )

            return True

    # ------------------------------------------------------------------
    # Hilo de simulación: avanza viajes y hace cierre contable
    # ------------------------------------------------------------------

    def _bucle_simulacion(self) -> None:
        """
        Cada 5 segundos de tiempo real:
        - Avanza 1 minuto simulado.
        - Reduce tiempo_restante de viajes.
        - Libera taxis cuando termina un viaje.
        - Cada 60 minutos simulados aplica cierre contable (20%).
        """
        while not self._detener:
            time.sleep(5.0)

            hacer_cierre = False

            with self._lock:
                # avanzamos reloj simulado
                self._minutos_simulados += 1

                # actualizar viajes
                for v in self._historial_viajes:
                    if v["estado"] in ("pendiente", "aceptado") and v.get(
                        "tiempo_restante"
                    ) is not None:
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

                # cada 60 minutos simulados → 1 día
                if self._minutos_simulados > 0 and self._minutos_simulados % 60 == 0:
                    self._dias_simulados += 1
                    hacer_cierre = True
                    print(
                        f"[SIM] Fin del día simulado {self._dias_simulados}. Se aplicará cierre contable."
                    )

            # hacemos el cierre FUERA del lock para no bloquear el hilo
            if hacer_cierre:
                self.cierre_contable()

    # ------------------------------------------------------------------
    # Cierre contable (20%)
    # ------------------------------------------------------------------

    def cierre_contable(self) -> None:
        """
        Aplica la comisión del 20% a la facturación bruta y
        acumula neto y comisión para cada taxi.
        """
        with self._lock:
            for t in self._taxis:
                if t.total_bruto <= 0:
                    continue

                comision = round(t.total_bruto * 0.20, 2)
                neto = round(t.total_bruto - comision, 2)

                t.total_comision += comision
                t.total_neto += neto
                t.total_bruto = 0.0

                print(
                    f"[CIERRE] Taxi {t.id}: comisión={comision}, neto={neto}, acumulado_neto={t.total_neto}"
                )

    # ------------------------------------------------------------------
    # Snapshots para la API / frontend
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
