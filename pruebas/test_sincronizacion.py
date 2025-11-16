# test_sincronizacion.py
"""
Pruebas básicas de sincronización y consistencia del sistema UNIETAXI.

Incluye:
- Verificar que no hay pares (cliente, taxi) duplicados.
- Comprobar que el desempate por rating funciona cuando la distancia es igual.
"""

from backend.sistema import SistemaAtencion
from backend.taxi import Taxi
from backend.cliente import Cliente
import time


def prueba_consistencia_asignaciones(num_taxis: int = 5, num_clientes: int = 20):
    print("=== PRUEBA DE CONSISTENCIA DE ASIGNACIONES ===")

    sistema = SistemaAtencion()
    sistema.iniciar()

    # Crear taxis
    taxis = []
    for i in range(num_taxis):
        t = Taxi(id_taxi=i, x=float(i), y=float(i), sistema=sistema)
        t.start()
        taxis.append(t)

    # Crear clientes
    clientes = []
    for i in range(num_clientes):
        c = Cliente(id_cliente=i, sistema=sistema)
        c.start()
        clientes.append(c)

    # Esperamos a que los clientes terminen su flujo principal
    inicio = time.time()
    timeout = 10.0
    for c in clientes:
        tiempo_restante = timeout - (time.time() - inicio)
        if tiempo_restante <= 0:
            break
        c.join(timeout=tiempo_restante)

    asignaciones = sistema.snapshot_asignaciones()
    print(f"\nTotal de asignaciones registradas: {len(asignaciones)}")

    # Comprobar que no hay pares (cliente, taxi) duplicados
    conjunto_asignaciones = set(asignaciones)
    if len(conjunto_asignaciones) != len(asignaciones):
        print("[ERROR] Se han encontrado asignaciones duplicadas (cliente, taxi).")
    else:
        print("[OK] No hay pares (cliente, taxi) duplicados.")

    # Comprobar que cada cliente aparece como máximo una vez
    clientes_asignados = [c_id for (c_id, _) in asignaciones]
    if len(clientes_asignados) != len(set(clientes_asignados)):
        print("[ADVERTENCIA] Un cliente aparece varias veces en las asignaciones.")
    else:
        print("[OK] Cada cliente tiene, como máximo, una asignación.")

    sistema.detener()


def prueba_empate_rating():
    """
    Verifica el desempate por rating:
    - Dos taxis a la misma distancia.
    - El sistema debe asignar el taxi con mejor rating.
    """
    print("\n=== PRUEBA DE EMPATE POR RATING ===")

    sistema = SistemaAtencion()
    sistema.iniciar()

    # Creamos dos taxis en la misma posición
    taxi1 = Taxi(id_taxi=1, x=0.0, y=0.0, sistema=sistema)
    taxi2 = Taxi(id_taxi=2, x=0.0, y=0.0, sistema=sistema)

    # Forzamos ratings manualmente para la prueba
    taxi1.rating = 3
    taxi2.rating = 5

    taxi1.start()
    taxi2.start()

    # Creamos un cliente cerca
    cliente = Cliente(id_cliente=100, sistema=sistema)
    cliente.x = 0.0
    cliente.y = 0.0
    cliente.start()

    # Esperamos a que el cliente termine su flujo
    cliente.join(timeout=5.0)

    if cliente.taxi_asignado is None:
        print("[ERROR] No se asignó ningún taxi al cliente en la prueba de empate.")
    else:
        print(f"Taxi asignado al cliente: {cliente.taxi_asignado.id}")
        if cliente.taxi_asignado.id == taxi2.id:
            print("[OK] Se ha elegido correctamente el taxi con mejor rating (5).")
        else:
            print("[ERROR] Se ha elegido el taxi con rating más bajo.")

    sistema.detener()


if __name__ == "__main__":
    prueba_consistencia_asignaciones()
    prueba_empate_rating()
