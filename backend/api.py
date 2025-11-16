# backend/api.py
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except ImportError:
    CORS = None

from . import main

app = Flask(__name__)
if CORS:
    CORS(app)

# Inicializar escenario al arrancar
if main.sistema is None:
    main.crear_escenario()


@app.route("/estado", methods=["GET"])
def estado():
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500
    estado = main.sistema.snapshot_estado()
    return jsonify(estado)


@app.route("/viaje", methods=["POST"])
def crear_viaje():
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    origen = data.get("origen")
    destino = data.get("destino")

    if not origen or not destino:
        return jsonify(
            {"ok": False, "mensaje": "Se requieren 'origen' y 'destino' en el JSON."}
        ), 400

    resultado = main.sistema.crear_viaje_desde_lugares(origen, destino)

    # Aunque no haya taxis (ok = False), devolvemos 200 para que el frontend
    # pueda mostrar el mensaje y el tiempo_espera_min
    return jsonify(resultado)


@app.route("/viaje/aceptar", methods=["POST"])
def aceptar_viaje():
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    id_viaje = data.get("id_viaje")
    if id_viaje is None:
        return jsonify({"ok": False, "mensaje": "id_viaje es requerido"}), 400

    try:
        id_viaje = int(id_viaje)
    except ValueError:
        return jsonify({"ok": False, "mensaje": "id_viaje debe ser un entero"}), 400

    ok = main.sistema.aceptar_viaje(id_viaje)
    if not ok:
        return jsonify({"ok": False, "mensaje": "No se pudo aceptar el viaje"}), 400

    return jsonify({"ok": True, "mensaje": "Viaje aceptado"})


@app.route("/viaje/finalizar", methods=["POST"])
def finalizar_viaje():
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    id_viaje = data.get("id_viaje")
    if id_viaje is None:
        return jsonify({"ok": False, "mensaje": "id_viaje es requerido"}), 400

    try:
        id_viaje = int(id_viaje)
    except ValueError:
        return jsonify({"ok": False, "mensaje": "id_viaje debe ser un entero"}), 400

    ok = main.sistema.finalizar_viaje(id_viaje)
    if not ok:
        return jsonify({"ok": False, "mensaje": "No se pudo finalizar el viaje"}), 400

    return jsonify({"ok": True, "mensaje": "Viaje finalizado"})


@app.route("/viaje/cancelar", methods=["POST"])
def cancelar_viaje():
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    id_viaje = data.get("id_viaje")
    if id_viaje is None:
        return jsonify({"ok": False, "mensaje": "id_viaje es requerido"}), 400

    try:
        id_viaje = int(id_viaje)
    except ValueError:
        return jsonify({"ok": False, "mensaje": "id_viaje debe ser un entero"}), 400

    ok = main.sistema.cancelar_viaje(id_viaje)
    if not ok:
        return jsonify({"ok": False, "mensaje": "No se pudo cancelar el viaje"}), 400

    return jsonify({"ok": True, "mensaje": "Viaje cancelado"})


@app.route("/viaje/calificar", methods=["POST"])
def calificar_viaje():
    """
    Endpoint para que el pasajero envíe la valoración (1–5 estrellas)
    de un viaje concreto.
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    id_viaje = data.get("id_viaje")
    estrellas = data.get("estrellas")

    if id_viaje is None or estrellas is None:
        return jsonify(
            {"ok": False, "mensaje": "id_viaje y estrellas son requeridos"}
        ), 400

    try:
        id_viaje = int(id_viaje)
        estrellas = int(estrellas)
    except ValueError:
        return jsonify(
            {"ok": False, "mensaje": "id_viaje y estrellas deben ser enteros"}
        ), 400

    ok = main.sistema.calificar_viaje(id_viaje, estrellas)
    if not ok:
        return jsonify(
            {"ok": False, "mensaje": "No se pudo registrar la valoración"}
        ), 400

    return jsonify({"ok": True, "mensaje": "Valoración registrada"})


@app.route("/cierre", methods=["POST"])
def cierre_contable():
    """
    Cierre contable manual (además del automático del hilo de simulación).
    Te sirve para probar en demos.
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    main.sistema.cierre_contable()
    return jsonify({"ok": True, "mensaje": "Cierre contable aplicado"})


if __name__ == "__main__":
    if main.sistema is None:
        main.crear_escenario()
    app.run(debug=True)
