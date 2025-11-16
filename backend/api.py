# backend/api.py
"""
API con Flask para exponer el estado de UNIETAXI al frontend (React).

Rutas:
- GET /estado          -> estado general (taxis, clientes, asignaciones)
- POST /viaje          -> crea un viaje a partir de origen/destino simbólicos
- POST /cierre         -> aplica el cierre contable (20% comisión)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from . import main

app = Flask(__name__)
CORS(app)  # Para permitir peticiones desde localhost:5173 (frontend)

# Al arrancar la API, creamos escenario si no existe
if main.sistema is None:
    main.crear_escenario(num_taxis=3, num_clientes=0)


@app.route("/estado")
def estado():
    if main.sistema is None:
        return jsonify({"error": "Sistema no inicializado"}), 500

    return jsonify(
        {
            "taxis": main.sistema.snapshot_taxis(),
            "clientes": main.sistema.snapshot_clientes(),
            "asignaciones": main.sistema.snapshot_asignaciones(),
            "viajes": main.sistema.snapshot_viajes(),
        }
    )


@app.post("/viaje")
def viaje():
    """
    Crea un viaje tipo Uber desde un origen y destino predefinidos.
    Espera JSON:
    {
        "origen": "Retiro",
        "destino": "Centro"
    }
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json(silent=True) or {}
    origen = data.get("origen")
    destino = data.get("destino")

    resultado = main.sistema.crear_viaje_desde_lugares(origen, destino)
    status = 200 if resultado.get("ok") else 400
    return jsonify(resultado), status


@app.post("/cierre")
def cierre():
    """
    Aplica el cierre contable (20% de comisión a los taxis).
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    main.sistema.cierre_contable()
    return jsonify({"ok": True, "taxis": main.sistema.snapshot_taxis()}), 200


if __name__ == "__main__":
    app.run(port=5000, debug=True)
