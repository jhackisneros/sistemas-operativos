# sistema.py
import threading
import math
from typing import List, Optional, Tuple
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from taxi import Taxi
    from cliente import Cliente



class SistemaAtencion:
    """
    MONITOR DEL SISTEMA UNIETAXI

    Responsabilidades:
    - Mantener las listas compartidas de taxis y clientes (recursos críticos).
    - Recibir solicitudes de taxi de los clientes.
    - Seleccionar el taxi más cercano (y, en caso de empate, mejor rating).
    - Notificar al cliente cuando su taxi ha sido asignado.

    Sincronización:
    - self._lock:
        Exclusión mutua sobre los recursos críticos.
    - self._sem_solicitudes:
        Semáforo que indica que hay solicitudes pendientes.
    - Hilo interno self._hilo_atencion que procesa la cola de solicitudes.
    """

    def __init__(self) -> None:
        # Recursos críticos
        self._taxis: List["Taxi"] = []
        self._clientes: List["Cliente"] = []
        self._cola_solicitudes: List["Cliente"] = []
        self._asignaciones: List[Tuple[int, int]] = []  # (id_cliente, id_taxi)

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
    # Métodos públicos de gestión
    # ------------------------------------------------------------------

    def iniciar(self) -> None:
        """Arranca el hilo interno del sistema de atención."""
        self._hilo_atencion.start()

    def detener(self) -> None:
        """Solicita detener el hilo interno del sistema."""
        self._detener = True
        # Liberamos el semáforo para que el hilo no se quede bloqueado
        self._sem_solicitudes.release()
        self._hilo_atencion.join(timeout=2)

    def registrar_taxi(self, taxi: "Taxi") -> None:
        """Registra un taxi en el sistema (sección crítica)."""
        with self._lock:
            self._taxis.append(taxi)

    def registrar_cliente(self, cliente: "Cliente") -> None:
        """Registra un cliente en el sistema (sección crítica)."""
        with self._lock:
            self._clientes.append(cliente)

    def solicitar_taxi(self, cliente: "Cliente") -> None:
        """
        El cliente llama a este método para pedir un taxi.

        No se hace la asignación aquí directamente: sólo se encola la solicitud
        y se despierta al hilo del sistema usando un semáforo.
        """
        with self._lock:
            self._cola_solicitudes.append(cliente)
        # Notificamos que hay una nueva solicitud pendiente
        self._sem_solicitudes.release()

    # ------------------------------------------------------------------
    # BUCLE INTERNO DEL SISTEMA (MONITOR ACTIVO)
    # ------------------------------------------------------------------

    def _bucle_atencion(self) -> None:
        """
        Hilo del sistema de atención.

        Espera solicitudes usando un semáforo y las procesa una a una,
        asignando el taxi más adecuado.
        """
        while not self._detener:
            # Espera a que haya al menos una solicitud
            self._sem_solicitudes.acquire()
            if self._detener:
                break

            cliente = self._obtener_siguiente_solicitud()
            if cliente is None:
                continue

            taxi = self._seleccionar_taxi_para(cliente)
            # Guardamos asignación y notificamos al cliente
            if taxi is not None:
                with self._lock:
                    self._asignaciones.append((cliente.id, taxi.id))
                cliente.taxi_asignado = taxi

            # Despierta al cliente: ya hay resultado (con o sin taxi)
            cliente.sem_asignacion.release()

    # ------------------------------------------------------------------
    # Métodos auxiliares (privados)
    # ------------------------------------------------------------------

    def _obtener_siguiente_solicitud(self) -> Optional["Cliente"]:
        """Extrae el siguiente cliente de la cola de solicitudes."""
        with self._lock:
            if not self._cola_solicitudes:
                return None
            return self._cola_solicitudes.pop(0)

    def _seleccionar_taxi_para(self, cliente: "Cliente") -> Optional["Taxi"]:
        """
        Lógica de match cliente-taxi.

        - Busca taxis libres.
        - Si hay varios en un radio de 2 km, se elige el más cercano.
        - Si hay empate, se usa la mejor calificación (rating más alto).
        """
        with self._lock:
            taxis_libres = [t for t in self._taxis if not t.ocupado]
            if not taxis_libres:
                return None

            def distancia(t: "Taxi") -> float:
                dx = t.x - cliente.x
                dy = t.y - cliente.y
                return math.hypot(dx, dy)

            # Filtrar por radio de 2 km
            candidatos = [t for t in taxis_libres if distancia(t) <= 2.0]
            if not candidatos:
                candidatos = taxis_libres

            candidatos.sort(key=lambda t: (distancia(t), -t.rating))

            taxi_elegido = candidatos[0]
            taxi_elegido.ocupado = True
            return taxi_elegido

    # ------------------------------------------------------------------
    # Métodos de SOLO LECTURA para API / pruebas
    # ------------------------------------------------------------------

    def snapshot_asignaciones(self) -> List[Tuple[int, int]]:
        """Devuelve una copia de las asignaciones (para API o debug)."""
        with self._lock:
            return list(self._asignaciones)

    def snapshot_taxis(self):
        """Devuelve info simplificada de los taxis."""
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
        """Devuelve info simplificada de los clientes."""
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
