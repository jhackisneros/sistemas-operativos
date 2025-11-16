# backend/taxi.py
import threading
import time
import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .sistema import SistemaAtencion


class Taxi(threading.Thread):
    """
    Representa un taxi dentro del sistema. Cada taxi es un hilo.
    """

    def __init__(self, id_taxi: int, x: float, y: float, sistema: "SistemaAtencion"):
        super().__init__(name=f"Taxi-{id_taxi}", daemon=True)
        self.id: int = id_taxi
        self.x: float = x
        self.y: float = y
        self.rating: int = random.randint(3, 5)
        self.ocupado: bool = False
        self.sistema: "SistemaAtencion" = sistema

    def run(self) -> None:
        """
        El taxi se registra y simula movimiento cuando está libre.
        """
        self.sistema.registrar_taxi(self)

        while True:
            if not self.ocupado:
                self.x += random.uniform(-0.1, 0.1)
                self.y += random.uniform(-0.1, 0.1)
            time.sleep(0.5)
