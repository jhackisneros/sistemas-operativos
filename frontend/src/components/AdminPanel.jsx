// frontend/src/components/AdminPanel.jsx
import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5000";

function AdminPanel() {
  const [password, setPassword] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  const [eventos, setEventos] = useState([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargandoCaso, setCargandoCaso] = useState(null); // 1,2,3

  // --------------------------------------------------
  // Llamadas a la API
  // --------------------------------------------------
  const cargarEventos = async () => {
    try {
      setCargandoEventos(true);
      setMensaje("");
      const resp = await fetch(`${API_URL}/admin/eventos`);
      const data = await resp.json();
      if (!data.ok) {
        setMensaje(data.mensaje || "Error al obtener los eventos.");
        return;
      }
      setEventos(data.eventos || []);
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API de UNIETAXI.");
    } finally {
      setCargandoEventos(false);
    }
  };

  const lanzarCaso = async (casoId) => {
    let endpoint = "";
    if (casoId === 1) endpoint = "/admin/test_doble_pasajero";
    if (casoId === 2) endpoint = "/admin/test_sin_taxis";
    if (casoId === 3) endpoint = "/admin/test_competencia_taxis";

    if (!endpoint) return;

    try {
      setCargandoCaso(casoId);
      setMensaje("");
      const resp = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!data.ok) {
        setMensaje(data.mensaje || "Error al lanzar el caso.");
        return;
      }
      setMensaje(data.mensaje || "Caso lanzado correctamente.");
      // Después de lanzar el caso, recargamos eventos para ver el efecto
      await cargarEventos();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API de UNIETAXI.");
    } finally {
      setCargandoCaso(null);
    }
  };

  // Si ya estoy autenticado, cargo los eventos al entrar
  useEffect(() => {
    if (autenticado) {
      cargarEventos();
    }
  }, [autenticado]);

  // --------------------------------------------------
  // Login sencillo (contraseña 1234)
  // --------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "1234") {
      setAutenticado(true);
      setMensaje("");
    } else {
      setMensaje("Contraseña incorrecta.");
    }
  };

  // --------------------------------------------------
  // Helpers para pintar los eventos de forma “humana”
  // --------------------------------------------------
  const colorPorTipo = (tipo) => {
    if (!tipo) return "#4b5563";
    if (tipo.startsWith("test_")) return "#22c55e"; // verde
    if (tipo.startsWith("viaje_creado")) return "#3b82f6"; // azul
    if (tipo.startsWith("viaje_sin_taxis")) return "#f97316"; // naranja
    if (tipo.startsWith("viaje_finalizado")) return "#14b8a6"; // turquesa
    if (tipo.startsWith("viaje_cancelado")) return "#ef4444"; // rojo
    if (tipo.startsWith("viaje_aceptado")) return "#a855f7"; // violeta
    if (tipo.startsWith("viaje_calificado")) return "#eab308"; // amarillo
    if (tipo.startsWith("asignacion_clasica")) return "#0ea5e9"; // celeste
    if (tipo.startsWith("cierre_contable")) return "#facc15"; // dorado
    return "#4b5563";
  };

  const etiquetaBonita = (tipo) => {
    switch (tipo) {
      case "test_doble_pasajero":
        return "CASO 1 · Dos pasajeros a la vez";
      case "test_sin_taxis":
        return "CASO 2 · Sin taxis libres";
      case "test_competencia_taxis":
        return "CASO 3 · Competencia por taxis";
      case "asignacion_clasica":
        return "Asignación (cola clásica)";
      case "asignacion_clasica_fallida":
        return "Asignación fallida";
      case "viaje_sin_taxis":
        return "Viaje sin taxis disponibles";
      case "viaje_creado":
        return "Viaje creado";
      case "viaje_aceptado":
        return "Viaje aceptado";
      case "viaje_finalizado_manual":
        return "Viaje finalizado por el taxista";
      case "viaje_finalizado_auto":
        return "Viaje finalizado por simulación";
      case "viaje_cancelado":
        return "Viaje cancelado";
      case "viaje_calificado":
        return "Viaje calificado";
      case "cierre_contable":
        return "Cierre contable (20%)";
      default:
        return tipo || "Evento";
    }
  };

  const renderExtraHumano = (evento) => {
    const { tipo, extra } = evento || {};
    if (!extra) return null;

    // Por tipo de evento damos un resumen “humano”
    switch (tipo) {
      case "test_doble_pasajero":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Se han creado dos clientes que piden taxi casi al mismo tiempo, para
            observar cómo el monitor reparte los taxis en la cola de
            solicitudes.
          </p>
        );

      case "test_sin_taxis":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Todos los taxis se marcaron como ocupados y se intentó crear un viaje
            Centro → Retiro. El sistema responde con “sin taxis” simulando
            saturación total del recurso.
          </p>
        );

      case "test_competencia_taxis":
        return (
          <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            <p>
              Se lanzan dos viajes casi simultáneos desde el mismo punto para ver
              qué taxi se asigna a cada uno.
            </p>
            {extra.viaje1 && (
              <p>
                • Viaje 1:{" "}
                {extra.viaje1.ok
                  ? `asignado al taxi ${extra.viaje1.taxi_id}`
                  : "no pudo asignarse (sin taxis libres)"}
              </p>
            )}
            {extra.viaje2 && (
              <p>
                • Viaje 2:{" "}
                {extra.viaje2.ok
                  ? `asignado al taxi ${extra.viaje2.taxi_id}`
                  : "no pudo asignarse (sin taxis libres)"}
              </p>
            )}
          </div>
        );

      case "asignacion_clasica":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El hilo del sistema ha emparejado al cliente{" "}
            <strong>{extra?.cliente_id}</strong> con el taxi{" "}
            <strong>{extra?.taxi_id}</strong> usando la cola de solicitudes y el
            semáforo.
          </p>
        );

      case "asignacion_clasica_fallida":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Se intentó asignar un taxi al cliente{" "}
            <strong>{extra?.cliente_id}</strong>, pero no había taxis libres en
            ese momento.
          </p>
        );

      case "viaje_sin_taxis":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            No había taxis libres para un viaje{" "}
            <strong>
              {extra?.origen} → {extra?.destino}
            </strong>
            . El sistema informa al pasajero de un tiempo de espera estimado.
          </p>
        );

      case "viaje_creado":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Se ha creado el viaje <strong>#{extra?.id_viaje}</strong> desde{" "}
            <strong>{extra?.origen}</strong> hasta{" "}
            <strong>{extra?.destino}</strong>, asignado al taxi{" "}
            <strong>{extra?.taxi_id}</strong> con una tarifa aproximada de{" "}
            <strong>{extra?.tarifa} €</strong>.
          </p>
        );

      case "viaje_aceptado":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El taxista ha aceptado el viaje{" "}
            <strong>#{extra?.id_viaje}</strong>. El estado pasa de “pendiente” a
            “aceptado”.
          </p>
        );

      case "viaje_finalizado_manual":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El taxista ha marcado como finalizado el viaje{" "}
            <strong>#{extra?.id_viaje}</strong>. El taxi{" "}
            <strong>{extra?.taxi_id}</strong> vuelve a estar libre.
          </p>
        );

      case "viaje_finalizado_auto":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El viaje <strong>#{extra?.id_viaje}</strong> ha terminado
            automáticamente cuando el tiempo simulado ha llegado a cero, y el
            taxi se ha liberado sin intervención manual.
          </p>
        );

      case "viaje_cancelado":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El pasajero ha cancelado el viaje{" "}
            <strong>#{extra?.id_viaje}</strong>. El taxi{" "}
            <strong>{extra?.taxi_id}</strong> queda disponible de nuevo.
          </p>
        );

      case "viaje_calificado":
        return (
          <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            El pasajero ha valorado el viaje{" "}
            <strong>#{extra?.id_viaje}</strong> con{" "}
            <strong>{extra?.estrellas} estrellas</strong>. El rating medio del
            taxi se actualiza.
          </p>
        );

      case "cierre_contable":
        return (
          <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            <p>
              Se ha aplicado el cierre contable del día: la empresa se queda con
              el 20% de comisión de cada taxi.
            </p>
            {Array.isArray(extra?.resumen) &&
              extra.resumen.map((r) => (
                <p key={r.taxi_id}>
                  • Taxi <strong>{r.taxi_id}</strong> → comisión{" "}
                  <strong>{r.comision} €</strong>, neto{" "}
                  <strong>{r.neto} €</strong> (acumulado:{" "}
                  <strong>{r.acumulado_neto} €</strong>)
                </p>
              ))}
          </div>
        );

      default:
        return null;
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  if (!autenticado) {
    // Pantalla de login
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top, #0f172a, #020617 60%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            backgroundColor: "rgba(15,23,42,0.95)",
            borderRadius: "24px",
            border: "1px solid #1f2937",
            padding: "24px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            UNIETAXI · Panel Admin
          </h1>
          <p
            style={{
              fontSize: "13px",
              opacity: 0.8,
              marginBottom: "18px",
              textAlign: "center",
            }}
          >
            Acceso para probar escenarios de concurrencia
            (hilos, semáforos, cierre contable…).
          </p>

          <form onSubmit={handleLogin}>
            <label
              style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}
            >
              Contraseña (demo): <strong>1234</strong>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "999px",
                border: "1px solid #374151",
                backgroundColor: "#020617",
                color: "white",
                fontSize: "13px",
                marginBottom: "12px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(to right, #22c55e, #a3e635, #22c55e)",
                color: "#022c22",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Entrar
            </button>
          </form>

          {mensaje && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "#f97316",
                textAlign: "center",
              }}
            >
              {mensaje}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Pantalla principal de admin
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #0f172a, #020617 60%)",
        color: "white",
        padding: "16px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
            UNIETAXI · Escenarios de concurrencia
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Aquí puedes lanzar situaciones típicas de carrera de hilos y ver cómo
            el monitor las resuelve.
          </p>
        </div>
        <button
          onClick={cargarEventos}
          disabled={cargandoEventos}
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid #4b5563",
            backgroundColor: cargandoEventos ? "#111827" : "#020617",
            color: "white",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {cargandoEventos ? "Actualizando..." : "Actualizar eventos"}
        </button>
      </header>

      {mensaje && (
        <p
          style={{
            marginBottom: "10px",
            fontSize: "12px",
            color: "#fbbf24",
          }}
        >
          {mensaje}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr",
          gap: "16px",
        }}
      >
        {/* Columna izquierda: Casos de prueba */}
        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.95)",
            borderRadius: "20px",
            border: "1px solid #1f2937",
            padding: "14px",
          }}
        >
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>
            Casos predefinidos
          </h2>
          <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "12px" }}>
            Cada caso genera hilos o peticiones en paralelo y deja un rastro de
            eventos que se ven a la derecha.
          </p>

          <div style={{ display: "grid", gap: "10px" }}>
            {/* CASO 1 */}
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #1f2937",
                padding: "10px",
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(15,23,42,0.9))",
              }}
            >
              <h3 style={{ fontSize: "14px", marginBottom: "4px" }}>
                CASO 1 · Dos pasajeros a la vez
              </h3>
              <p style={{ fontSize: "12px", opacity: 0.85, marginBottom: "6px" }}>
                Dos clientes se encolan casi al mismo tiempo en la cola clásica.
                Sirve para enseñar cómo el monitor usa el semáforo + lock para
                repartir los taxis.
              </p>
              <button
                onClick={() => lanzarCaso(1)}
                disabled={cargandoCaso === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "#38bdf8",
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cargandoCaso === 1 ? "Lanzando..." : "Lanzar caso 1"}
              </button>
            </div>

            {/* CASO 2 */}
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #1f2937",
                padding: "10px",
                background:
                  "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(15,23,42,0.95))",
              }}
            >
              <h3 style={{ fontSize: "14px", marginBottom: "4px" }}>
                CASO 2 · Sin taxis libres
              </h3>
              <p style={{ fontSize: "12px", opacity: 0.85, marginBottom: "6px" }}>
                Se marcan temporalmente todos los taxis como ocupados y se intenta
                crear un viaje. El sistema responde con “sin_taxis” y un tiempo de
                espera simulado.
              </p>
              <button
                onClick={() => lanzarCaso(2)}
                disabled={cargandoCaso === 2}
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "#f97316",
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cargandoCaso === 2 ? "Lanzando..." : "Lanzar caso 2"}
              </button>
            </div>

            {/* CASO 3 */}
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #1f2937",
                padding: "10px",
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.16), rgba(15,23,42,0.95))",
              }}
            >
              <h3 style={{ fontSize: "14px", marginBottom: "4px" }}>
                CASO 3 · Competencia por taxis
              </h3>
              <p style={{ fontSize: "12px", opacity: 0.85, marginBottom: "6px" }}>
                Se crean dos viajes casi simultáneos desde el mismo lugar para ver
                cómo se reparten los taxis en función de la distancia y rating.
              </p>
              <button
                onClick={() => lanzarCaso(3)}
                disabled={cargandoCaso === 3}
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "#a855f7",
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cargandoCaso === 3 ? "Lanzando..." : "Lanzar caso 3"}
              </button>
            </div>
          </div>
        </section>

        {/* Columna derecha: Línea de tiempo de eventos */}
        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.95)",
            borderRadius: "20px",
            border: "1px solid #1f2937",
            padding: "14px",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>
            Línea de tiempo de eventos
          </h2>
          <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "10px" }}>
            Cada tarjeta representa una decisión de sincronización del sistema:
            asignaciones, viajes creados, cancelaciones, cierres contables…
          </p>

          {eventos.length === 0 && !cargandoEventos && (
            <p style={{ fontSize: "13px", opacity: 0.8 }}>
              Aún no hay eventos registrados. Lanza alguno de los casos de la
              izquierda o espera a que la simulación genere actividades.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {eventos
              .slice()
              .reverse()
              .map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: "14px",
                    border: "1px solid #1f2937",
                    padding: "10px",
                    backgroundColor: "#020617",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        opacity: 0.7,
                      }}
                    >
                      {ev.instante}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: colorPorTipo(ev.tipo),
                        color: "#020617",
                        fontWeight: 600,
                      }}
                    >
                      {etiquetaBonita(ev.tipo)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      marginBottom: "4px",
                    }}
                  >
                    {ev.descripcion}
                  </p>
                  {renderExtraHumano(ev)}
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminPanel;
