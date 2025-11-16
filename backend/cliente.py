# backend/cliente.py
import threading
import time
import random
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .sistema import SistemaAtencion
    from .taxi import Taxi


class Cliente(threading.Thread):
    """
    Representa un cliente dentro del sistema. Cada cliente es un hilo.

    - Genera una posición (x, y).
    - Se registra en el sistema.
    - Solicita un taxi.
    - Espera la asignación usando un SEMÁFORO binario (sem_asignacion).
    """

    def __init__(self, id_cliente: int, sistema: "SistemaAtencion"):
        super().__init__(name=f"Cliente-{id_cliente}", daemon=True)
        self.id: int = id_cliente
        self.x: float = random.uniform(0, 10)
        self.y: float = random.uniform(0, 10)
        self.sistema: "SistemaAtencion" = sistema

        # Taxi asignado (None si no se ha asignado aún)
        self.taxi_asignado: Optional["Taxi"] = None

        # SEMÁFORO:
        #   - Inicialmente a 0 → el cliente está "bloqueado".
        #   - El sistema lo liberará cuando tenga una respuesta.
        self.sem_asignacion = threading.Semaphore(0)

    def run(self) -> None:
        """
        Lógica principal del hilo Cliente.

        1. Espera un tiempo aleatorio (simula que el usuario abre la app).
        2. Se registra en el sistema.
        3. Solicita un taxi.
        4. Espera la asignación con el semáforo.
        5. Procesa el resultado (con o sin taxi).
        """
        # Pequeña espera aleatoria antes de pedir taxi
        time.sleep(random.uniform(0.5, 2.0))

        # Registro en el sistema
        self.sistema.registrar_cliente(self)

        # Enviar solicitud al sistema
        self.sistema.solicitar_taxi(self)

        # Esperar asignación
        self.sem_asignacion.acquire()

        # En este punto, el sistema ya ha intentado asignar un taxi
        if self.taxi_asignado is not None:
            print(f"[Cliente {self.id}] Taxi asignado: {self.taxi_asignado.id}")
        else:
            print(f"[Cliente {self.id}] No hay taxis disponibles por el momento.")
