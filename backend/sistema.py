# backend/sistema.py
import threading
import math
from typing import List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from .taxi import Taxi
    from .cliente import Cliente


# Puntos fijos de la ciudad para la simulación (origen/destino)
LOCACIONES = {
    "Retiro": (2.0, 3.0),
    "Centro": (5.0, 5.0),
    "Aeropuerto": (9.0, 1.0),
    "Universidad": (1.0, 8.0),
    "Estación Norte": (7.0, 9.0),
}


class SistemaAtencion:
    """
    MONITOR DEL SISTEMA UNIETAXI

    - Mantiene listas de taxis y clientes.
    - Gestiona solicitudes de taxi (desde hilos Cliente).
    - Ofrece métodos para crear viajes "manuales" (desde la API).
    - Aplica un cierre contable: descuenta el 20% de comisión a los taxis.
    """

    def __init__(self) -> None:
        # Recursos críticos
        self._taxis: List["Taxi"] = []
        self._clientes: List["Cliente"] = []
        self._cola_solicitudes: List["Cliente"] = []
        self._asignaciones: List[Tuple[int, int]] = []  # (id_cliente, id_taxi)

        # Historial de viajes creados desde la API
        self._historial_viajes: List[dict] = []

        # Mecanismos de sincronización
        self._lock = threading.Lock()
        self._sem_solicitudes = threading.Semaphore(0)

        # Control del hilo del sistema
        self._detener = False
        self._hilo_atencion = threading.Thread(
            target=self._bucle_atencion,
            daemon=True,
            name="HiloSistemaAtencion",
        )

    # ------------------------------------------------------------------
    # Gestión de hilos
    # ------------------------------------------------------------------

    def iniciar(self) -> None:
        """Arranca el hilo interno del sistema de atención."""
        self._hilo_atencion.start()

    def detener(self) -> None:
        """Solicita detener el hilo interno del sistema."""
        self._detener = True
        self._sem_solicitudes.release()
        self._hilo_atencion.join(timeout=2)

    # ------------------------------------------------------------------
    # Registro de entidades
    # ------------------------------------------------------------------

    def registrar_taxi(self, taxi: "Taxi") -> None:
        with self._lock:
            self._taxis.append(taxi)

    def registrar_cliente(self, cliente: "Cliente") -> None:
        with self._lock:
            self._clientes.append(cliente)

    # ------------------------------------------------------------------
    # Flujo clásico de Cliente (hilos)
    # ------------------------------------------------------------------

    def solicitar_taxi(self, cliente: "Cliente") -> None:
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    def _bucle_atencion(self) -> None:
        """Hilo interno que atiende la cola de solicitudes de clientes."""
        while not self._detener:
            self._sem_solicitudes.acquire()
            if self._detener:
                break

            cliente = self._obtener_siguiente_solicitud()
            if cliente is None:
                continue

            taxi = self._seleccionar_taxi_para_posicion(cliente.x, cliente.y)
            if taxi is not None:
                with self._lock:
                    self._asignaciones.append((cliente.id, taxi.id))
                cliente.taxi_asignado = taxi

            cliente.sem_asignacion.release()

    def _obtener_siguiente_solicitud(self) -> Optional["Cliente"]:
        with self._lock:
            if not self._cola_solicitudes:
                return None
            return self._cola_solicitudes.pop(0)

    # ------------------------------------------------------------------
    # Selección de taxi (monitor)
    # ------------------------------------------------------------------

    def _seleccionar_taxi_para_posicion(self, x: float, y: float) -> Optional["Taxi"]:
        """
        Lógica de match cliente-taxi en una posición concreta (x, y).

        - Busca taxis libres.
        - Si hay varios en un radio de 2 km, se elige el más cercano.
        - Si hay empate, se usa la mejor calificación (rating más alto).
        """
        with self._lock:
            taxis_libres = [t for t in self._taxis if not t.ocupado]
            if not taxis_libres:
                return None

            def distancia(t: "Taxi") -> float:
                dx = t.x - x
                dy = t.y - y
                return math.hypot(dx, dy)

            candidatos = [t for t in taxis_libres if distancia(t) <= 2.0]
            if not candidatos:
                candidatos = taxis_libres

            candidatos.sort(key=lambda t: (distancia(t), -t.rating))
            taxi_elegido = candidatos[0]
            taxi_elegido.ocupado = True
            return taxi_elegido

    # ------------------------------------------------------------------
    # VIAJES "MANUALES" DESDE LA API (tipo Uber)
    # ------------------------------------------------------------------

    def crear_viaje_desde_lugares(self, origen: str, destino: str):
        """
        Crea un viaje 'a lo Uber' desde dos lugares simbólicos:
        - origen, destino: nombres como 'Retiro', 'Centro', etc.

        Devuelve un diccionario con información del viaje o un error.
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
            return {
                "ok": False,
                "motivo": "sin_taxis",
                "mensaje": "No hay taxis disponibles en este momento.",
            }

        # Calcular distancia, tarifa y duración simulada
        distancia = math.hypot(dx - ox, dy - oy)  # distancia "en km" simulados
        tarifa_base = 3.0
        tarifa_km = 2.0
        tarifa = tarifa_base + tarifa_km * distancia
        tarifa = round(tarifa, 2)

        # Tiempo simulado en minutos (24h -> 5 min se explica a nivel conceptual)
        duracion_min = max(3, distancia * 4)  # p.e. 4 minutos por "km"
        duracion_min = round(duracion_min, 1)

        viaje = {
            "origen": origen,
            "destino": destino,
            "taxi_id": taxi.id,
            "rating_taxi": taxi.rating,
            "distancia_aprox_km": round(distancia, 2),
            "tarifa": tarifa,
            "duracion_min": duracion_min,
        }

        # Actualizar economía del taxi y guardar el viaje
        with self._lock:
            taxi.total_bruto += tarifa
            taxi.viajes_realizados += 1
            self._historial_viajes.append(viaje)
            # Para la demo liberamos el taxi inmediatamente (viaje "finalizado")
            taxi.ocupado = False

        # Respuesta al frontend
        return {"ok": True, **viaje}

    # ------------------------------------------------------------------
    # CIERRE CONTABLE (20% comisión UNIETAXI)
    # ------------------------------------------------------------------

    def cierre_contable(self):
        """
        Simula el cierre contable del día:
        - A cada taxi se le descuenta el 20% de su total_bruto acumulado.
        - Se actualizan total_neto y total_comision.
        - Se resetea total_bruto (nuevo día).
        """
        with self._lock:
            for t in self._taxis:
                if t.total_bruto <= 0:
                    continue
                comision = round(t.total_bruto * 0.20, 2)
                liquido = round(t.total_bruto - comision, 2)
                t.total_comision += comision
                t.total_neto += liquido
                t.total_bruto = 0.0

    # ------------------------------------------------------------------
    # Snapshots para API
    # ------------------------------------------------------------------

    def snapshot_asignaciones(self) -> List[Tuple[int, int]]:
        with self._lock:
            return list(self._asignaciones)

    def snapshot_taxis(self):
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

    def snapshot_clientes(self):
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

    def snapshot_viajes(self):
        """Devuelve una copia del historial de viajes."""
        with self._lock:
            return list(self._historial_viajes)
