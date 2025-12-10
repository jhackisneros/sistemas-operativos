// frontend/src/components/AdminPanel.jsx
import React, { useState } from "react";

const API_BASE = "http://localhost:5000";

const DESCRIPCIONES_CASOS = {
  1: "CASO 1: Dos clientes piden taxi casi a la vez desde la misma posición. Se usa la cola clásica con semáforo y el hilo de atención decide el orden de asignación.",
  2: "CASO 2: Petición cuando no hay taxis libres. Se fuerzan temporalmente todos los taxis a 'ocupado' para ver cómo el monitor responde con 'sin_taxis'.",
  3: "CASO 3: Dos viajes 'tipo Uber' desde el mismo origen casi al mismo tiempo. El monitor asigna taxis según distancia y rating, y puedes ver qué ocurre con el segundo viaje.",
};

function AdminPanel() {
  const [password, setPassword] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [casoActual, setCasoActual] = useState(null);

  const intentarLogin = (e) => {
    e.preventDefault();
    if (password === "1234") {
      setAutorizado(true);
      setMensaje("");
    } else {
      setMensaje("Contraseña incorrecta");
    }
    setPassword("");
  };

  const cargarEventos = async () => {
    try {
      setCargando(true);
      setMensaje("");
      const resp = await fetch(`${API_BASE}/admin/eventos`);
      const data = await resp.json();
      if (!data.ok) {
        setMensaje(data.mensaje || "Error al cargar eventos.");
        return;
      }
      setEventos(data.eventos || []);
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API de UNIETAXI.");
    } finally {
      setCargando(false);
    }
  };

  const lanzarCaso = async (numCaso) => {
    let endpoint = "";
    if (numCaso === 1) endpoint = "/admin/test_doble_pasajero";
    if (numCaso === 2) endpoint = "/admin/test_sin_taxis";
    if (numCaso === 3) endpoint = "/admin/test_competencia_taxis";

    if (!endpoint) return;

    try {
      setCargando(true);
      setMensaje("");
      setCasoActual(numCaso);

      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (!data.ok) {
        setMensaje(data.mensaje || "Error al lanzar el caso.");
        return;
      }
      setMensaje(data.mensaje);
      // Después de lanzar el caso, recargamos eventos
      await cargarEventos();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API de UNIETAXI.");
    } finally {
      setCargando(false);
    }
  };

  if (!autorizado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            backgroundColor: "#0b1120",
            borderRadius: "16px",
            padding: "24px",
            width: "100%",
            maxWidth: "360px",
            border: "1px solid #1f2937",
          }}
        >
          <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>
            UNIETAXI – Admin
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "16px" }}>
            Introduce la contraseña de administrador para ver y lanzar los casos
            de concurrencia del sistema.
          </p>
          <form onSubmit={intentarLogin}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #374151",
                marginBottom: "10px",
                backgroundColor: "#020617",
                color: "#e5e7eb",
              }}
            />
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: "#22c55e",
                color: "#020617",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Entrar
            </button>
          </form>
          {mensaje && (
            <p
              style={{
                fontSize: "12px",
                marginTop: "10px",
                color: "#f97316",
              }}
            >
              {mensaje}
            </p>
          )}
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #374151",
              backgroundColor: "transparent",
              color: "#9ca3af",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Volver a UNIETAXI
          </button>
        </div>
      </div>
    );
  }

  const descripcionCasoActual =
    casoActual != null ? DESCRIPCIONES_CASOS[casoActual] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
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
          <h1 style={{ fontSize: "22px" }}>UNIETAXI – Panel Admin</h1>
          <p style={{ fontSize: "12px", opacity: 0.7 }}>
            Visualización de casos de concurrencia (hilos, semáforos, monitor).
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid #374151",
            backgroundColor: "transparent",
            color: "#9ca3af",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Volver a app
        </button>
      </header>

      <section
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => lanzarCaso(1)}
          disabled={cargando}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#22c55e",
            color: "#020617",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          CASO 1 · Dos pasajeros a la vez
        </button>

        <button
          onClick={() => lanzarCaso(2)}
          disabled={cargando}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#f97316",
            color: "#020617",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          CASO 2 · Sin taxis libres
        </button>

        <button
          onClick={() => lanzarCaso(3)}
          disabled={cargando}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#3b82f6",
            color: "#e5e7eb",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          CASO 3 · Competencia por taxis
        </button>

        <button
          onClick={cargarEventos}
          disabled={cargando}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "1px solid #374151",
            cursor: "pointer",
            backgroundColor: "transparent",
            color: "#e5e7eb",
            fontSize: "13px",
          }}
        >
          {cargando ? "Actualizando eventos..." : "Actualizar eventos"}
        </button>
      </section>

      {casoActual && (
        <section
          style={{
            backgroundColor: "#0b1120",
            borderRadius: "16px",
            border: "1px solid #1f2937",
            padding: "10px",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ fontSize: "15px", marginBottom: "4px" }}>
            Explicación del caso {casoActual}
          </h2>
          <p style={{ fontSize: "12px", opacity: 0.85 }}>
            {descripcionCasoActual}
          </p>
        </section>
      )}

      {mensaje && (
        <p
          style={{
            fontSize: "12px",
            marginBottom: "10px",
            color: "#fbbf24",
          }}
        >
          {mensaje}
        </p>
      )}

      <section
        style={{
          backgroundColor: "#0b1120",
          borderRadius: "16px",
          border: "1px solid #1f2937",
          padding: "12px",
        }}
      >
        <h2 style={{ fontSize: "15px", marginBottom: "8px" }}>
          Eventos recientes del sistema
        </h2>
        <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px" }}>
          Usa los botones de casos y luego revisa aquí cómo el monitor ha ido
          tomando decisiones (asignación de taxis, falta de recursos, fin de
          viajes, etc.).
        </p>
        <div
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            fontSize: "12px",
          }}
        >
          {eventos.length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              No hay eventos aún. Lanza algún caso o utiliza la app normal.
            </p>
          ) : (
            eventos
              .slice()
              .reverse()
              .map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    borderBottom: "1px solid #111827",
                    padding: "6px 2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>{ev.instante}</span>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "999px",
                        border: "1px solid #374151",
                        fontSize: "10px",
                        textTransform: "uppercase",
                      }}
                    >
                      {ev.tipo}
                    </span>
                  </div>
                  <div>{ev.descripcion}</div>
                  {ev.extra && (
                    <pre
                      style={{
                        marginTop: "2px",
                        backgroundColor: "#020617",
                        borderRadius: "8px",
                        padding: "4px 6px",
                        fontSize: "11px",
                        overflowX: "auto",
                      }}
                    >
                      {JSON.stringify(ev.extra, null, 2)}
                    </pre>
                  )}
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminPanel;
