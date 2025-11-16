# taxi.py
import threading
import time
import random
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from sistema import SistemaAtencion


class Taxi(threading.Thread):
    """
    Representa un taxi dentro del sistema. Cada taxi es un hilo.

    - Al arrancar, se registra en el SistemaAtencion.
    - En esta versión simple, el taxi sólo "vive" y puede simular movimiento.
    """

    def __init__(self, id_taxi: int, x: float, y: float, sistema: "SistemaAtencion"):
        super().__init__(name=f"Taxi-{id_taxi}", daemon=True)
        self.id: int = id_taxi
        self.x: float = x
        self.y: float = y
        self.rating: int = random.randint(3, 5)  # rating inicial (3 a 5)
        self.ocupado: bool = False
        self.sistema: "SistemaAtencion" = sistema

        # A futuro se podría añadir:
        # - semáforo para nuevos viajes
        # - trayectoria del taxi, etc.

    def run(self) -> None:
        """
        Lógica principal del hilo Taxi.

        1. Se registra en el sistema.
        2. Simula que está "vivo" moviéndose ligeramente cada cierto tiempo.
        """
        self.sistema.registrar_taxi(self)

        while True:
            # Simular ligero movimiento aleatorio cuando está libre
            if not self.ocupado:
                self.x += random.uniform(-0.1, 0.1)
                self.y += random.uniform(-0.1, 0.1)

            # Dormimos un poco para no saturar la CPU
            time.sleep(0.5)
