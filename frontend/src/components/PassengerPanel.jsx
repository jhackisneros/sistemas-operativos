import React, { useState } from "react";

const LUGARES = [
  "Retiro",
  "Centro",
  "Aeropuerto",
  "Universidad",
  "Estación Norte"
];

function PassengerPanel({ taxis, clientes, asignaciones, onRefrescar }) {
  const [origen, setOrigen] = useState("Retiro");
  const [destino, setDestino] = useState("Centro");
  const [infoViaje, setInfoViaje] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const solicitarViaje = async () => {
    try {
      setMensaje("");
      setInfoViaje(null);

      const resp = await fetch("http://localhost:5000/viaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, destino })
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "No se pudo crear el viaje.");
        return;
      }

      setInfoViaje(data);
      setMensaje("Viaje creado correctamente. Taxi asignado.");
      // Actualizamos estado global (tarjetas, taxis, etc.)
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("Error al conectar con la API de UNIETAXI.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Columna izquierda: formulario tipo Uber */}
      <section>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vista pasajero</h2>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "12px" }}>
          Elige origen y destino y la app te asigna un taxi y calcula la tarifa.
        </p>

        <div
          style={{
            background:
              "radial-gradient(circle at top left, #22c55e33, transparent 60%)",
            borderRadius: "16px",
            padding: "14px",
            border: "1px solid #1f2937"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "15px", marginBottom: "10px" }}>
            Solicitar un UNIETAXI
          </h3>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "12px", opacity: 0.8 }}>Origen</label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              style={selectEstilo}
            >
              {LUGARES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "12px", opacity: 0.8 }}>Destino</label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={selectEstilo}
            >
              {LUGARES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button onClick={solicitarViaje} style={botonVerde}>
            Pedir UNIETAXI
          </button>

          {mensaje && (
            <p style={{ marginTop: "8px", fontSize: "12px", color: "#fbbf24" }}>
              {mensaje}
            </p>
          )}

          {infoViaje && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px",
                borderRadius: "12px",
                backgroundColor: "#020617",
                border: "1px dashed #22c55e80",
                fontSize: "13px"
              }}
            >
              <p style={{ margin: 0 }}>
                Origen: <strong>{infoViaje.origen}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Destino: <strong>{infoViaje.destino}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Taxi asignado: <strong>#{infoViaje.taxi_id}</strong> (⭐{" "}
                {infoViaje.rating_taxi})
              </p>
              <p style={{ margin: 0 }}>
                Distancia aprox: {infoViaje.distancia_aprox_km} km
              </p>
              <p style={{ margin: 0 }}>
                Tarifa estimada: <strong>{infoViaje.tarifa} €</strong>
              </p>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                Duración simulada: {infoViaje.duracion_min} min
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Columna derecha: lista de taxis (como antes) */}
      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Taxis activos</h3>
        {taxis.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No hay taxis en el sistema.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              padding: "10px",
              maxHeight: "260px",
              overflowY: "auto"
            }}
          >
            {taxis.map((t) => (
              <div
                key={t.id}
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
                  <div style={{ fontWeight: 600 }}>Taxi #{t.id}</div>
                  <div style={{ opacity: 0.7 }}>
                    Posición: ({t.x.toFixed(2)}, {t.y.toFixed(2)})
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>⭐ {t.rating}</div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: t.ocupado ? "#f97316" : "#22c55e"
                    }}
                  >
                    {t.ocupado ? "Ocupado" : "Libre"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const selectEstilo = {
  width: "100%",
  padding: "6px",
  borderRadius: "8px",
  border: "1px solid #1f2937",
  marginTop: "2px",
  backgroundColor: "#020617",
  color: "white",
  fontSize: "13px"
};

const botonVerde = {
  marginTop: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  backgroundColor: "#22c55e",
  color: "#020617",
  fontWeight: 600
};

export default PassengerPanel;
