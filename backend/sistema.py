# backend/sistema.py
import threading
import math
from typing import List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from .taxi import Taxi
    from .cliente import Cliente


class SistemaAtencion:
    def __init__(self) -> None:
        self._taxis: List["Taxi"] = []
        self._clientes: List["Cliente"] = []
        self._cola_solicitudes: List["Cliente"] = []
        self._asignaciones: List[Tuple[int, int]] = []

        self._lock = threading.Lock()
        self._sem_solicitudes = threading.Semaphore(0)

        self._detener = False
        self._hilo_atencion = threading.Thread(
            target=self._bucle_atencion,
            daemon=True,
            name="HiloSistemaAtencion",
        )

    def iniciar(self) -> None:
        self._hilo_atencion.start()

    def detener(self) -> None:
        self._detener = True
        self._sem_solicitudes.release()
        self._hilo_atencion.join(timeout=2)

    def registrar_taxi(self, taxi: "Taxi") -> None:
        with self._lock:
            self._taxis.append(taxi)

    def registrar_cliente(self, cliente: "Cliente") -> None:
        with self._lock:
            self._clientes.append(cliente)

    def solicitar_taxi(self, cliente: "Cliente") -> None:
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    def _bucle_atencion(self) -> None:
        from .cliente import Cliente  # solo por type hints en algunos editores

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

    def _obtener_siguiente_solicitud(self) -> Optional["Cliente"]:
        with self._lock:
            if not self._cola_solicitudes:
                return None
            return self._cola_solicitudes.pop(0)

    def _seleccionar_taxi_para(self, cliente: "Cliente") -> Optional["Taxi"]:
        with self._lock:
            taxis_libres = [t for t in self._taxis if not t.ocupado]
            if not taxis_libres:
                return None

            def distancia(t: "Taxi") -> float:
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
