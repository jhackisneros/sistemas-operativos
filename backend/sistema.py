# backend/sistema.py
import threading
import math
import time
from typing import List, Optional, Tuple, Dict

# ----------------- Lugares simbólicos (para la app web) -----------------

LOCACIONES: Dict[str, Tuple[float, float]] = {
    "Retiro": (1.0, 1.0),
    "Centro": (2.0, 2.0),
    "Aeropuerto": (5.0, 1.0),
    "Universidad": (3.0, 4.0),
    "Estación Norte": (4.0, 3.0),
}


# ----------------- Clases Taxi y Cliente (modelo WEB) -----------------


class Taxi:
    """
    Modelo de taxi usado por el monitor y la API.

    NO es un hilo en sí mismo (para simplificar la API),
    pero se gestiona de forma concurrente desde el monitor.

    Campos importantes para el informe:
    - ocupado: indica si el recurso (taxi) está siendo usado.
    - total_bruto: ingresos del día antes de comisión.
    - total_neto: ingresos netos para el taxista.
    - total_comision: lo que gana la empresa (20%).
    - viajes_realizados: total de servicios.
    - rating: media de valoraciones de clientes.
    """

    def __init__(self, id_: int, x: float, y: float, rating: int = 5) -> None:
        self.id: int = id_
        self.x: float = x
        self.y: float = y
        self.rating: float = float(rating)

        # Estado
        self.ocupado: bool = False

        # Economía
        self.total_bruto: float = 0.0
        self.total_neto: float = 0.0
        self.total_comision: float = 0.0
        self.viajes_realizados: int = 0

        # Para rating promedio
        self.total_valoraciones: int = 0
        self.suma_valoraciones: int = 0

    def registrar_valoracion(self, estrellas: int) -> None:
        """Actualiza la media de estrellas del taxi."""
        self.total_valoraciones += 1
        self.suma_valoraciones += estrellas
        self.rating = round(
            self.suma_valoraciones / max(1, self.total_valoraciones), 1
        )


class Cliente:
    """
    Modelo de cliente para el monitor / API.

    En la versión "clásica por hilos" (cliente.py) esta clase hereda de Thread.
    Aquí solo se usa como entidad de datos.
    """

    def __init__(self, id_: int, x: float, y: float) -> None:
        self.id: int = id_
        self.x: float = x
        self.y: float = y

        self.taxi_asignado: Optional[Taxi] = None
        # semáforo para el caso clásico de asignación (cliente.py)
        self.sem_asignacion = threading.Semaphore(0)


# ----------------- MONITOR DEL SISTEMA DE ATENCIÓN -----------------


class SistemaAtencion:
    """
    Monitor principal del sistema UNIETAXI.

    Recursos críticos protegidos por Lock:
    - lista de taxis
    - lista de clientes
    - cola de solicitudes
    - historial de viajes

    Hilos internos:
    - HiloSistemaAtencion: atiende la cola de solicitudes clásicas (cliente.py).
    - HiloSimulacionViajes: avanza los tiempos de los viajes,
      libera taxis y simula el paso del tiempo.
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

        # Reloj simulado (para el informe / posible UI)
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

    # ------------------------------------------------------------------
    # Cola de solicitudes clásica (cliente.py)
    # ------------------------------------------------------------------

    def solicitar_taxi(self, cliente: Cliente) -> None:
        """
        Versión clásica: el cliente se encola y el hilo de atención asigna taxi.

        Esto se usa en la versión con hilos Cliente (cliente.py) para
        demostrar semáforos y monitor. La app web usa directamente
        crear_viaje_desde_lugares.
        """
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    def _bucle_atencion(self) -> None:
        """
        Hilo del monitor que atiende la cola de solicitudes clásicas
        usando un semáforo.
        """
        while not self._detener:
            self._sem_solicitudes.acquire()
            if self._detener:
                break

            cliente = self._obtener_siguiente_solicitud()
            if cliente is None:
                continue

            taxi = self._seleccionar_taxi_para_cliente(cliente)
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

    def _seleccionar_taxi_para_cliente(self, cliente: Cliente) -> Optional[Taxi]:
        """Selecciona taxi basándose en la posición del cliente (modelo clásico)."""
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

    def _seleccionar_taxi_para_posicion(
        self, x: float, y: float
    ) -> Optional[Taxi]:
        """
        Versión para las coordenadas de los lugares simbólicos (app web).
        """
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
    # Viajes "tipo Uber" para la app web
    # ------------------------------------------------------------------

    def crear_viaje_desde_lugares(self, origen: str, destino: str) -> dict:
        """
        Crea un viaje 'a lo Uber' desde dos lugares simbólicos.

        - Si hay taxis libres → asigna uno, marca taxi.ocupado = True y crea viaje.
        - Si no hay taxis libres → devuelve ok=False con tiempo_espera_min.
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
                "mensaje": (
                    "No hay taxis libres. "
                    "Aproximadamente en 20 minutos habrá uno disponible."
                ),
                "tiempo_espera_min": 20,
            }

        # Calcular distancia, tarifa y duración simulada
        distancia = math.hypot(dx - ox, dy - oy)
        tarifa_base = 3.0
        tarifa_km = 2.0
        tarifa = round(tarifa_base + tarifa_km * distancia, 2)
        duracion_min = max(3, int(round(distancia * 4)))

        with self._lock:
            self._contador_viajes += 1
            id_viaje = self._contador_viajes

            viaje = {
                "id_viaje": id_viaje,
                "estado": "pendiente",  # pendiente → aceptado → finalizado/cancelado
                "origen": origen,
                "destino": destino,
                "taxi_id": taxi.id,
                "rating_taxi": taxi.rating,
                "distancia_aprox_km": round(distancia, 2),
                "tarifa": tarifa,
                "duracion_min": duracion_min,
                "tiempo_restante": duracion_min,  # minutos simulados
                "rating_cliente": None,
            }

            taxi.ocupado = True
            taxi.total_bruto += tarifa
            taxi.viajes_realizados += 1

            self._historial_viajes.append(viaje)

        return {"ok": True, **viaje}

    def aceptar_viaje(self, id_viaje: int) -> bool:
        """El taxista acepta un viaje pendiente (cambia a estado 'aceptado')."""
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
        (el hilo de simulación también puede finalizar cuando tiempo_restante llega a 0)
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
            viaje["tiempo_restante"] = 0

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

            viaje["rating_cliente"] = estrellas
            taxi.registrar_valoracion(estrellas)

            print(
                f"[RATING] Taxi {taxi.id}: nueva valoración {estrellas}⭐ → rating medio {taxi.rating}"
            )

            return True

    # ------------------------------------------------------------------
    # Hilo de simulación: avanza viajes y simula el tiempo
    # ------------------------------------------------------------------

    def _bucle_simulacion(self) -> None:
        """
        Cada 5 segundos de tiempo real:
        - Avanza 1 minuto simulado.
        - Reduce tiempo_restante de los viajes.
        - Libera taxis cuando termina un viaje.
        - Cada 60 minutos simulados se incrementa el contador de días.
        """
        while not self._detener:
            time.sleep(5.0)

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
                            v["tiempo_restante"] = 0
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
                    print(
                        f"[SIM] Fin del día simulado {self._dias_simulados}."
                    )

    # ------------------------------------------------------------------
    # Cierre contable (manual, desde la API)
    # ------------------------------------------------------------------

    def cierre_contable(self) -> dict:
        """
        Aplica la comisión del 20% a la facturación bruta y
        acumula neto y comisión para cada taxi.
        """
        resumen = []
        with self._lock:
            for t in self._taxis:
                if t.total_bruto <= 0:
                    continue

                comision = round(t.total_bruto * 0.20, 2)
                neto = round(t.total_bruto - comision, 2)

                t.total_comision += comision
                t.total_neto += neto
                t.total_bruto = 0.0

                resumen.append(
                    {
                        "taxi_id": t.id,
                        "comision": comision,
                        "neto": neto,
                    }
                )

                print(
                    f"[CIERRE] Taxi {t.id}: comisión={comision}, neto={neto}, acumulado_neto={t.total_neto}"
                )

        return {"ok": True, "resumen": resumen}

    # ------------------------------------------------------------------
    # Snapshots para la API / frontend
    # ------------------------------------------------------------------

    def _reloj_hhmm(self) -> str:
        """Devuelve el reloj simulado en formato HH:MM (día acelerado)."""
        minutos = self._minutos_simulados % (24 * 60)
        h = minutos // 60
        m = minutos % 60
        return f"{h:02d}:{m:02d}"

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
        """
        Estructura pensada para la API /estado.
        """
        return {
            "ok": True,
            "reloj": self._reloj_hhmm(),
            "dia_simulado": self._dias_simulados,
            "taxis": self.snapshot_taxis(),
            "clientes": self.snapshot_clientes(),
            "asignaciones": self.snapshot_asignaciones(),
            "viajes": self.snapshot_viajes(),
        }
