# api.py
"""
API muy sencilla con Flask para exponer el estado de UNIETAXI al frontend (React).

Para usarla:
    pip install flask

Luego:
    python api.py

IMPORTANTE:
- Aquí creamos un pequeño escenario de ejemplo cuando se arranca la API.
- React puede hacer peticiones GET a /estado para mostrar datos.
"""

from flask import Flask, jsonify
from main import crear_escenario, sistema, clientes, taxis

app = Flask(__name__)

# Al arrancar la API, creamos un escenario sencillo
crear_escenario(num_taxis=3, num_clientes=5)


@app.route("/estado")
def estado():
    """Devuelve un snapshot del sistema: taxis, clientes y asignaciones."""
    return jsonify(
        {
            "taxis": sistema.snapshot_taxis(),
            "clientes": sistema.snapshot_clientes(),
            "asignaciones": sistema.snapshot_asignaciones(),
        }
    )


if __name__ == "__main__":
    app.run(port=5000, debug=True)
