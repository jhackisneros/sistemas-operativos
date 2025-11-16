# backend/api.py
"""
API muy sencilla con Flask para exponer el estado de UNIETAXI al frontend (React).

Para usarla:
    pip install flask flask-cors

Luego:
    python -m backend.api
"""

from flask import Flask, jsonify
from flask_cors import CORS
from . import main  # importamos el módulo main del backend

app = Flask(__name__)

# Habilitar CORS para que React (localhost:5173) pueda llamar a la API (localhost:5000)
CORS(app)  # en desarrollo lo dejamos abierto

# Al arrancar la API, creamos un escenario sencillo si no está creado
if main.sistema is None:
    main.crear_escenario(num_taxis=3, num_clientes=5)


@app.route("/estado")
def estado():
    """Devuelve un snapshot del sistema: taxis, clientes y asignaciones."""
    if main.sistema is None:
        return jsonify({"error": "Sistema no inicializado"}), 500

    return jsonify(
        {
            "taxis": main.sistema.snapshot_taxis(),
            "clientes": main.sistema.snapshot_clientes(),
            "asignaciones": main.sistema.snapshot_asignaciones(),
        }
    )


if __name__ == "__main__":
    app.run(port=5000, debug=True)
