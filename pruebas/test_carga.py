
#

## 🧪 2) `pruebas/test_carga.py`


# test_carga.py
"""
Prueba de carga para el sistema UNIETAXI.

Objetivo:
- Crear muchos hilos de taxis y clientes.
- Ver si el sistema aguanta la carga sin errores graves.
- Obtener un pequeño resumen estadístico.
"""

from backend.main import crear_escenario, esperar_final_clientes, mostrar_resumen, sistema, clientes


def prueba_carga(num_taxis: int = 20, num_clientes: int = 200):
    print("=== PRUEBA DE CARGA UNIETAXI ===")
    print(f"Creando escenario con {num_taxis} taxis y {num_clientes} clientes...\n")

    crear_escenario(num_taxis=num_taxis, num_clientes=num_clientes)
    # Damos tiempo a que los clientes terminen su flujo principal
    esperar_final_clientes(timeout=15.0)

    asignaciones = sistema.snapshot_asignaciones()

    total_clientes = len(clientes)
    clientes_con_taxi = len({c_id for c_id, _ in asignaciones})
    clientes_sin_taxi = total_clientes - clientes_con_taxi

    print("\n=== RESUMEN PRUEBA DE CARGA ===")
    print(f"Total de clientes:      {total_clientes}")
    print(f"Clientes con taxi:      {clientes_con_taxi}")
    print(f"Clientes sin taxi:      {clientes_sin_taxi}")
    print(f"Total de asignaciones:  {len(asignaciones)}")

    # Pequeña comprobación de sanidad: no debería haber más asignaciones que clientes
    if len(asignaciones) > total_clientes:
        print("\n[ADVERTENCIA] Hay más asignaciones que clientes. Podría indicar un problema.")
    else:
        print("\n[OK] Número de asignaciones coherente con el número de clientes.")

    # Podemos mostrar un resumen breve más detallado
    # (o descomentar mostrar_resumen() si queremos ver todo)
    # mostrar_resumen()

    # Detenemos el hilo interno del sistema
    sistema.detener()


if __name__ == "__main__":
    prueba_carga()
