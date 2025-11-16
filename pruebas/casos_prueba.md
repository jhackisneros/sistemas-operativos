# Casos de prueba – Sistema UNIETAXI

Este documento describe los casos de prueba diseñados para validar
el funcionamiento del sistema UNIETAXI, centrado en:

- Creación y gestión de hilos (taxis y clientes).
- Control de recursos críticos mediante monitor y locks.
- Sincronización mediante semáforos.
- Asignación correcta cliente–taxi.
- Comportamiento en casos extremos.

---

## CP-01 – Escenario básico (funcionamiento normal)

**Objetivo**  
Verificar que el sistema es capaz de:

- Registrar taxis y clientes.
- Asignar taxis a los clientes.
- No producir errores de concurrencia aparentes.

**Datos de entrada**

- 3 taxis.
- 5 clientes.

**Pasos**

1. Ejecutar el módulo `backend/main.py`:

   ```bash
   python -m backend.main
