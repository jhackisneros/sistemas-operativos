# main.py
"""
Punto de entrada principal para la simulación de UNIETAXI (backend).

- Crea el SistemaAtencion (monitor).
- Crea N taxis (hilos).
- Crea M clientes (hilos).
- Arranca el hilo interno del sistema.
- Espera a que los clientes terminen y muestra las asignaciones finales.
"""

from .sistema import SistemaAtencion
from .taxi import Taxi
from .cliente import Cliente
import time


# Variables globales simples (útiles si luego se quiere acceder desde api.py)
sistema: SistemaAtencion
taxis: list[Taxi]
clientes: list[Cliente]


def crear_escenario(num_taxis: int = 3, num_clientes: int = 5):
    """Crea las entidades principales y arranca la simulación básica."""
    global sistema, taxis, clientes

    sistema = SistemaAtencion()
    sistema.iniciar()

    # Crear taxis
    taxis = []
    for i in range(num_taxis):
        t = Taxi(id_taxi=i, x=i * 1.0, y=i * 1.0, sistema=sistema)
        t.start()
        taxis.append(t)

    # Crear clientes
    clientes = []
    for i in range(num_clientes):
        c = Cliente(id_cliente=i, sistema=sistema)
        c.start()
        clientes.append(c)


def esperar_final_clientes(timeout: float = 5.0):
    """
    Espera a que los clientes terminen su flujo principal.

    No esperamos a los taxis porque son hilos "infinitos" (daemon).
    """
    inicio = time.time()
    for c in clientes:
        tiempo_restante = timeout - (time.time() - inicio)
        if tiempo_restante <= 0:
            break
        c.join(timeout=tiempo_restante)


def mostrar_resumen():
    """Imprime por consola el estado final de las asignaciones."""
    print("\n=== RESUMEN ASIGNACIONES UNIETAXI ===")
    asignaciones = sistema.snapshot_asignaciones()
    if not asignaciones:
        print("No se ha realizado ninguna asignación.")
    else:
        for id_cliente, id_taxi in asignaciones:
            print(f"Cliente {id_cliente} → Taxi {id_taxi}")

    print("\nTaxis:")
    for t in sistema.snapshot_taxis():
        print(t)
