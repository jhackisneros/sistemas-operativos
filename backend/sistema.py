# backend/sistema.py
import threading
import math
import random
from typing import List, Optional, Tuple, Dict

# ----------------- Lugares simbólicos para la "ciudad" -----------------

# Coordenadas simples en un plano (x, y)
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

        # Semáforo para que el cliente espere a que el sistema le asigne taxi
        self.sem_asignacion = threading.Semaphore(0)


# ----------------- MONITOR DEL SISTEMA DE ATENCIÓN -----------------


class SistemaAtencion:
    """
    MONITOR DEL SISTEMA UNIETAXI

    Responsabilidades:
    - Mantener las listas compartidas de taxis y clientes (recursos críticos).
    - Recibir solicitudes de taxi de los clientes (cola de solicitudes).
    - Seleccionar el taxi más cercano (o con mejor rating en caso de empate).
    - Crear viajes "tipo Uber" entre lugares simbólicos.

    Sincronización:
    - self._lock         → exclusión mutua sobre los recursos compartidos.
    - self._sem_solicitudes → semáforo para despertar al hilo del sistema.
    - self._hilo_atencion   → hilo que procesa solicitudes de taxi.
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
    # Métodos públicos de gestión general
    # ------------------------------------------------------------------

    def iniciar(self) -> None:
        """Arranca el hilo interno del sistema de atención."""
        self._hilo_atencion.start()

    def detener(self) -> None:
        """Solicita detener el hilo interno del sistema."""
        self._detener = True
        self._sem_solicitudes.release()
        self._hilo_atencion.join(timeout=2)

    def registrar_taxi(self, taxi: Taxi) -> None:
        """Registra un taxi en el sistema (sección crítica)."""
        with self._lock:
            self._taxis.append(taxi)

    def registrar_cliente(self, cliente: Cliente) -> None:
        """Registra un cliente en el sistema (sección crítica)."""
        with self._lock:
            self._clientes.append(cliente)

    def solicitar_taxi(self, cliente: Cliente) -> None:
        """
        El cliente llama a este método para pedir un taxi clásico
        (utilizando las coordenadas x, y del cliente).
        """
        with self._lock:
            self._cola_solicitudes.append(cliente)
        self._sem_solicitudes.release()

    # ------------------------------------------------------------------
    # Bucle interno del sistema (monitor activo)
    # ------------------------------------------------------------------

    def _bucle_atencion(self) -> None:
        """
        Hilo del sistema de atención.

        Espera solicitudes usando un semáforo y las procesa una a una,
        asignando el taxi más adecuado.
    """
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

            # Despertar al cliente (tenga taxi o no)
            cliente.sem_asignacion.release()

    def _obtener_siguiente_solicitud(self) -> Optional[Cliente]:
        with self._lock:
            if not self._cola_solicitudes:
                return None
            return self._cola_solicitudes.pop(0)

    # ------------------------------------------------------------------
    # Selección de taxi (por coordenadas de cliente o por lugar)
    # ------------------------------------------------------------------

    def _seleccionar_taxi_para(self, cliente: Cliente) -> Optional[Taxi]:
        """
        Lógica de match clásico cliente-taxi usando coordenadas (x, y).
        """
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
        """
        Lógica de match para el modo "Uber" (usamos una posición (x, y)
        derivada del punto de origen simbólico).
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
    # Viajes "tipo Uber" (origen/destino simbólicos)
    # ------------------------------------------------------------------

    def crear_viaje_desde_lugares(self, origen: str, destino: str) -> dict:
        """
        Crea un viaje 'a lo Uber' desde dos lugares simbólicos.

        El sistema:
          - selecciona un taxi (libre)
          - marca el taxi como OCUPADO
          - crea un viaje con estado 'pendiente'
            (a la espera de aceptación del taxista)
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
        distancia = math.hypot(dx - ox, dy - oy)
        tarifa_base = 3.0
        tarifa_km = 2.0
        tarifa = round(tarifa_base + tarifa_km * distancia, 2)
        duracion_min = round(max(3, distancia * 4), 1)

        with self._lock:
            # id de viaje incremental
            self._contador_viajes += 1
            id_viaje = self._contador_viajes

            viaje = {
                "id_viaje": id_viaje,
                "estado": "pendiente",  # pendiente → aceptado → finalizado
                "origen": origen,
                "destino": destino,
                "taxi_id": taxi.id,
                "rating_taxi": taxi.rating,
                "distancia_aprox_km": round(distancia, 2),
                "tarifa": tarifa,
                "duracion_min": duracion_min,
            }

            # El taxi se marca como OCUPADO y se actualizan sus datos
            taxi.ocupado = True
            taxi.total_bruto += tarifa
            taxi.viajes_realizados += 1

            self._historial_viajes.append(viaje)

        # Respuesta al frontend (pasajero)
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
        El taxista marca el viaje como finalizado.
        Aquí liberamos el taxi (vuelve a estar libre).
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

            # liberar taxi
            taxi_id = viaje["taxi_id"]
            for t in self._taxis:
                if t.id == taxi_id:
                    t.ocupado = False
                    break

            return True

    # ------------------------------------------------------------------
    # Cierre contable (simula 24h → descuento 20% a cada taxi)
    # ------------------------------------------------------------------

    def cierre_contable(self) -> None:
        """
        Aplica un cierre contable simple:
        - toma el total_bruto acumulado del taxi,
        - calcula la comisión del 20%,
        - acumula en total_comision y total_neto,
        - y pone el total_bruto a 0 para el siguiente día.
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

    # ------------------------------------------------------------------
    # Snapshots (para API / debug)
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
        """
        Resumen completo para el endpoint /estado del backend.
        """
        return {
            "taxis": self.snapshot_taxis(),
            "clientes": self.snapshot_clientes(),
            "asignaciones": self.snapshot_asignaciones(),
            "viajes": self.snapshot_viajes(),
        }
