// frontend/src/components/DriverPanel.jsx
import React, { useState, useEffect } from "react";

function DriverPanel({ taxis, clientes, asignaciones, viajes, onRefrescar }) {
  const [mensaje, setMensaje] = useState("");
  const [reloj, setReloj] = useState("00:00");

  // ⏰ Reloj simulado: 24 horas en 5 minutos reales
  useEffect(() => {
    const inicioReal = Date.now();
    const DURACION_DIA_REAL_MS = 5 * 60 * 1000; // 5 minutos en ms
    const MINUTOS_DIA_SIMULADO = 24 * 60; // 1440 minutos

    const id = setInterval(() => {
      const ahora = Date.now();
      const transcurrido = ahora - inicioReal;

      // Ciclo que se repite cada 5 minutos
      const ciclo = transcurrido % DURACION_DIA_REAL_MS;

      const fraccion = ciclo / DURACION_DIA_REAL_MS; // 0..1
      const minutosSimulados = Math.floor(fraccion * MINUTOS_DIA_SIMULADO); // 0..1439

      const horas = Math.floor(minutosSimulados / 60);
      const minutos = minutosSimulados % 60;

      const hh = horas.toString().padStart(2, "0");
      const mm = minutos.toString().padStart(2, "0");
      setReloj(`${hh}:${mm}`);
    }, 500); // actualizamos 2 veces por segundo

    return () => clearInterval(id);
  }, []);

  const taxiYo = taxis.length > 0 ? taxis[0] : null;

  const viajesTaxiYo = taxiYo
    ? viajes.filter((v) => v.taxi_id === taxiYo.id)
    : [];

  const viajesPendientes = viajesTaxiYo.filter((v) => v.estado === "pendiente");
  const viajesAceptados = viajesTaxiYo.filter((v) => v.estado === "aceptado");
  const viajesFinalizados = viajesTaxiYo.filter(
    (v) => v.estado === "finalizado"
  );

  const aceptarViaje = async (id_viaje) => {
    try {
      setMensaje("");
      const resp = await fetch("http://localhost:5000/viaje/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al aceptar el viaje.");
        return;
      }
      setMensaje("Has aceptado el viaje " + id_viaje);
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al aceptar el viaje.");
    }
  };

  const finalizarViaje = async (id_viaje) => {
    try {
      setMensaje("");
      const resp = await fetch("http://localhost:5000/viaje/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al finalizar el viaje.");
        return;
      }
      setMensaje("Has finalizado el viaje " + id_viaje);
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al finalizar el viaje.");
    }
  };

  // Botón de cierre contable: lo sigues usando tú manualmente
  const hacerCierre = async () => {
    try {
      setMensaje("");
      const resp = await fetch("http://localhost:5000/cierre", {
        method: "POST"
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al hacer el cierre contable.");
        return;
      }
      setMensaje("Cierre contable aplicado.");
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al hacer el cierre.");
    }
  };

  return (
    <div
      style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}
    >
      <section>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vista taxista</h2>

        {/* Reloj del día simulado */}
        <div
          style={{
            marginBottom: "8px",
            padding: "8px 10px",
            borderRadius: "999px",
            border: "1px solid #1f2937",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            backgroundColor: "#020617"
          }}
        >
          <span style={{ opacity: 0.7 }}>
            Reloj del día simulado (24h → 5 min):
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 600,
              letterSpacing: "1px"
            }}
          >
            {reloj}
          </span>
        </div>

        {taxiYo ? (
          <div
            style={{
              marginTop: "8px",
              background:
                "radial-gradient(circle at top left, #0ea5e933, transparent 60%)",
              borderRadius: "16px",
              padding: "14px",
              border: "1px solid #1f2937"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "15px", marginBottom: "8px" }}>
              Taxi #{taxiYo.id}
            </h3>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Posición aprox: ({taxiYo.x.toFixed(2)}, {taxiYo.y.toFixed(2)})
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Rating: ⭐ {taxiYo.rating}
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Estado:{" "}
              <span style={{ color: taxiYo.ocupado ? "#f97316" : "#22c55e" }}>
                {taxiYo.ocupado ? "Ocupado" : "Libre"}
              </span>
            </p>
            <hr
              style={{
                borderColor: "#1f2937",
                margin: "10px 0"
              }}
            />
            <p style={{ margin: 0, fontSize: "13px" }}>
              Facturación del día (bruto):{" "}
              <strong>{taxiYo.total_bruto.toFixed(2)} €</strong>
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Total recibido (neto, tras comisiones):{" "}
              <strong>{taxiYo.total_neto.toFixed(2)} €</strong>
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Comisión total pagada a UNIETAXI:{" "}
              <strong>{taxiYo.total_comision.toFixed(2)} €</strong>
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Viajes realizados: <strong>{taxiYo.viajes_realizados}</strong>
            </p>

            <button
              onClick={hacerCierre}
              style={{
                marginTop: "10px",
                padding: "6px 10px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: "#eab308",
                color: "#020617",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Aplicar cierre contable (20 %)
            </button>

            {mensaje && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "#fbbf24"
                }}
              >
                {mensaje}
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No hay taxis registrados en el sistema.
          </p>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>
          Viajes pendientes (nuevos pasajeros)
        </h3>
        {viajesPendientes.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No tienes viajes pendientes.
          </p>
        ) : (
          <div style={panelLista}>
            {viajesPendientes.map((v) => (
              <FilaViaje
                key={v.id_viaje}
                viaje={v}
                accion="Aceptar"
                onClick={() => aceptarViaje(v.id_viaje)}
                color="#22c55e"
              />
            ))}
          </div>
        )}

        <h3
          style={{ fontSize: "15px", marginBottom: "6px", marginTop: "10px" }}
        >
          Viajes en curso / aceptados
        </h3>
        {viajesAceptados.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No tienes viajes en curso.
          </p>
        ) : (
          <div style={panelLista}>
            {viajesAceptados.map((v) => (
              <FilaViaje
                key={v.id_viaje}
                viaje={v}
                accion="Finalizar"
                onClick={() => finalizarViaje(v.id_viaje)}
                color="#f97316"
              />
            ))}
          </div>
        )}

        <h3
          style={{ fontSize: "15px", marginBottom: "6px", marginTop: "10px" }}
        >
          Viajes finalizados
        </h3>
        {viajesFinalizados.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Aún no tienes viajes finalizados.
          </p>
        ) : (
          <div style={panelLista}>
            {viajesFinalizados.map((v) => (
              <div
                key={v.id_viaje}
                style={{
                  padding: "6px 4px",
                  borderBottom: "1px solid #111827",
                  fontSize: "13px"
                }}
              >
                <div>
                  #{v.id_viaje} · {v.origen} → {v.destino}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>
                  Tarifa: {v.tarifa} € · {v.duracion_min} min ·{" "}
                  {v.rating_cliente
                    ? `Valoración cliente: ${v.rating_cliente}★`
                    : "Sin valoración"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilaViaje({ viaje, accion, onClick, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 4px",
        borderBottom: "1px solid #111827",
        fontSize: "13px"
      }}
    >
      <div>
        <div>
          #{viaje.id_viaje} · {viaje.origen} → {viaje.destino}
        </div>
        <div style={{ fontSize: "11px", opacity: 0.8 }}>
          Tarifa: {viaje.tarifa} € · {viaje.duracion_min} min
        </div>
      </div>
      <button
        onClick={onClick}
        style={{
          padding: "4px 8px",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          fontSize: "12px",
          backgroundColor: color,
          color: "#020617",
          fontWeight: 600
        }}
      >
        {accion}
      </button>
    </div>
  );
}

const panelLista = {
  backgroundColor: "#020617",
  borderRadius: "16px",
  border: "1px solid #1f2937",
  padding: "10px",
  marginBottom: "10px",
  maxHeight: "150px",
  overflowY: "auto"
};

export default DriverPanel;
