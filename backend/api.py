# backend/api.py
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except ImportError:
    CORS = None

from . import main
from .sistema import Cliente  # para crear clientes de prueba en los casos admin

app = Flask(__name__)
if CORS:
    CORS(app)


# Inicializar escenario al arrancar la API
if main.sistema is None:
    main.crear_escenario()


@app.route("/estado", methods=["GET"])
def estado():
    """
    Devuelve un snapshot del sistema para el frontend:
    - reloj simulado
    - taxis
    - clientes
    - asignaciones
    - viajes
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    estado = main.sistema.snapshot_estado()
    return jsonify(estado), 200


@app.route("/viaje", methods=["POST"])
def crear_viaje():
    """
    Crea un viaje 'a lo Uber' desde origen/destino simbólicos.

    Siempre devuelve 200, incluso si no hay taxis (ok=False),
    para que el frontend pueda mostrar el motivo (sin_taxis, etc.).
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    data = request.get_json() or {}
    origen = data.get("origen")
    destino = data.get("destino")

    if not origen or not destino:
        return (
            jsonify(
                {
                    "ok": False,
                    "mensaje": "Se requieren 'origen' y 'destino' en el JSON.",
                    "motivo": "parametros",
                }
            ),
            200,
        )

    resultado = main.sistema.crear_viaje_desde_lugares(origen, destino)
    return jsonify(resultado), 200


@app.route("/viaje/aceptar", methods=["POST"])
def aceptar_viaje():
    """
    Endpoint para que el taxista acepte un viaje pendiente.
    """
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

    return jsonify({"ok": True, "mensaje": "Viaje aceptado"}), 200


@app.route("/viaje/finalizar", methods=["POST"])
def finalizar_viaje():
    """
    Endpoint para que el taxista marque viaje como finalizado.
    """
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

    return jsonify({"ok": True, "mensaje": "Viaje finalizado"}), 200


@app.route("/viaje/cancelar", methods=["POST"])
def cancelar_viaje():
    """
    Endpoint para que el pasajero cancele un viaje.
    """
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

    return jsonify({"ok": True, "mensaje": "Viaje cancelado"}), 200


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

    return jsonify({"ok": True, "mensaje": "Valoración registrada"}), 200


@app.route("/cierre", methods=["POST"])
def cierre_contable():
    """
    Cierre contable manual (20% comisión).
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    res = main.sistema.cierre_contable()
    return jsonify(res), 200


# ------------------------------------------------------------------
# ENDPOINTS DE ADMIN / CASOS DE CONCURRENCIA
# ------------------------------------------------------------------


@app.route("/admin/eventos", methods=["GET"])
def admin_eventos():
    """
    Devuelve la lista de eventos registrados por el monitor
    (asignaciones, sin taxis, cierre contable, etc.).
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    eventos = main.sistema.snapshot_eventos()
    return jsonify({"ok": True, "eventos": eventos}), 200


@app.route("/admin/test_doble_pasajero", methods=["POST"])
def admin_test_doble_pasajero():
    """
    CASO 1:
    Dos clientes piden taxi casi a la vez desde la misma posición.
    Usa la cola clásica + hilo de atención.
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    s = main.sistema

    c1 = Cliente(9001, 2.5, 2.5)
    c2 = Cliente(9002, 2.5, 2.5)

    s.registrar_cliente(c1)
    s.registrar_cliente(c2)

    # Encolamos casi "a la vez"
    s.solicitar_taxi(c1)
    s.solicitar_taxi(c2)

    s.registrar_evento_admin(
        "test_doble_pasajero",
        "Lanzado CASO 1: dos clientes piden taxi casi a la vez.",
        {"clientes": [c1.id, c2.id]},
    )

    return jsonify(
        {
            "ok": True,
            "caso": 1,
            "mensaje": "CASO 1 lanzado. Revisa los eventos en el panel admin.",
        }
    ), 200


@app.route("/admin/test_sin_taxis", methods=["POST"])
def admin_test_sin_taxis():
    """
    CASO 2:
    Simular petición cuando no hay taxis libres.
    Forzamos temporalmente todos los taxis a ocupado para que
    crear_viaje_desde_lugares devuelva 'sin_taxis', y luego
    restauramos el estado anterior.
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    s = main.sistema

    # Guardamos estado actual de ocupación
    with s._lock:  # usamos el lock del monitor (solo para este test)
        estados_previos = [t.ocupado for t in s._taxis]
        for t in s._taxis:
            t.ocupado = True

    # Esto debería devolver "ok=False, motivo=sin_taxis"
    resultado = s.crear_viaje_desde_lugares("Centro", "Retiro")

    # Restauramos estado anterior
    with s._lock:
        for t, ocupado_prev in zip(s._taxis, estados_previos):
            t.ocupado = ocupado_prev

    s.registrar_evento_admin(
        "test_sin_taxis",
        "Lanzado CASO 2: petición sin taxis libres.",
        {"resultado": resultado},
    )

    return jsonify(
        {
            "ok": True,
            "caso": 2,
            "mensaje": "CASO 2 lanzado (sin taxis libres). Revisa los eventos.",
        }
    ), 200


@app.route("/admin/test_competencia_taxis", methods=["POST"])
def admin_test_competencia_taxis():
    """
    CASO 3:
    Dos viajes 'tipo Uber' desde el mismo origen casi a la vez.
    Muestra cómo el monitor asigna taxis y qué pasa si ya no quedan libres.
    """
    if main.sistema is None:
        return jsonify({"ok": False, "mensaje": "Sistema no inicializado"}), 500

    s = main.sistema

    res1 = s.crear_viaje_desde_lugares("Centro", "Universidad")
    res2 = s.crear_viaje_desde_lugares("Centro", "Universidad")

    s.registrar_evento_admin(
        "test_competencia_taxis",
        "Lanzado CASO 3: dos viajes desde el mismo punto casi simultáneos.",
        {"viaje1": res1, "viaje2": res2},
    )

    return jsonify(
        {
            "ok": True,
            "caso": 3,
            "mensaje": "CASO 3 lanzado (competencia por taxis). Revisa los eventos.",
        }
    ), 200


if __name__ == "__main__":
    if main.sistema is None:
        main.crear_escenario()
    app.run(debug=True)
