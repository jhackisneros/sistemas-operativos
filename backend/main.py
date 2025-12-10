# backend/main.py
"""
Configura el escenario inicial de UNIETAXI.

- Crea el monitor (SistemaAtencion).
- Registra N taxis (libres) con posiciones aleatorias.
- Opcionalmente registra algunos clientes.
- Arranca los hilos internos del monitor (atención + simulación).
"""

from .sistema import SistemaAtencion, Taxi, Cliente
import random

# Variables globales que usa api.py
sistema: SistemaAtencion | None = None
taxis: list[Taxi] = []
clientes: list[Cliente] = []


def crear_escenario(num_taxis: int = 3, num_clientes: int = 0) -> SistemaAtencion:
    """
    Crea un sistema nuevo, con taxis todos LIBRES,
    y arranca los hilos internos del monitor.
    """
    global sistema, taxis, clientes

    sistema = SistemaAtencion()
    taxis = []
    clientes = []

    # Creamos taxis con posiciones aleatorias en un cuadrado 0..5 x 0..5
    for i in range(num_taxis):
        x = random.uniform(0, 5)
        y = random.uniform(0, 5)
        rating = random.randint(3, 5)
        t = Taxi(i, x, y, rating)

        # aseguramos que empiezan totalmente libres, sin viajes previos
        t.ocupado = False
        t.total_bruto = 0.0
        t.total_neto = 0.0
        t.total_comision = 0.0
        t.viajes_realizados = 0

        sistema.registrar_taxi(t)
        taxis.append(t)

    # (Opcional) Creamos clientes, pero NO lanzamos hilos ni solicitudes automáticas
    for i in range(num_clientes):
        x = random.uniform(0, 5)
        y = random.uniform(0, 5)
        c = Cliente(i, x, y)
        sistema.registrar_cliente(c)
        clientes.append(c)

    # Arrancamos los hilos internos (atención + simulación)
    sistema.iniciar()

    print("[MAIN] Escenario creado con", len(taxis), "taxis y", len(clientes), "clientes.")
    return sistema


if __name__ == "__main__":
    # Demo mínima si ejecutas: python -m backend.main
    crear_escenario()
    print("[MAIN] Sistema inicializado. Ejecuta python -m backend.api para usar la API Flask.")
