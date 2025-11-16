# backend/main.py
from .sistema import SistemaAtencion
from .taxi import Taxi
from .cliente import Cliente
import time

sistema: SistemaAtencion
taxis: list[Taxi]
clientes: list[Cliente]


def crear_escenario(num_taxis: int = 3, num_clientes: int = 5):
    global sistema, taxis, clientes

    sistema = SistemaAtencion()
    sistema.iniciar()

    taxis = []
    for i in range(num_taxis):
        t = Taxi(id_taxi=i, x=i * 1.0, y=i * 1.0, sistema=sistema)
        t.start()
        taxis.append(t)

    clientes = []
    for i in range(num_clientes):
        c = Cliente(id_cliente=i, sistema=sistema)
        c.start()
        clientes.append(c)


def esperar_final_clientes(timeout: float = 5.0):
    inicio = time.time()
    for c in clientes:
        tiempo_restante = timeout - (time.time() - inicio)
        if tiempo_restante <= 0:
            break
        c.join(timeout=tiempo_restante)


def mostrar_resumen():
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

    print("\nClientes:")
    for c in sistema.snapshot_clientes():
            print(c)


if __name__ == "__main__":
    crear_escenario(num_taxis=3, num_clientes=5)
    esperar_final_clientes(timeout=8.0)
    mostrar_resumen()
    sistema.detener()
