// frontend/src/components/PassengerPanel.jsx
import React, { useState } from "react";

const LUGARES = [
  "Retiro",
  "Centro",
  "Aeropuerto",
  "Universidad",
  "Estación Norte"
];

function PassengerPanel({ taxis, clientes, asignaciones, onRefrescar }) {
  const [origen, setOrigen] = useState(() => {
    const idx = Math.floor(Math.random() * LUGARES.length);
    return LUGARES[idx];
  });

  const [destino, setDestino] = useState(() => {
    const opciones = LUGARES.filter((l) => l !== LUGARES[0]);
    return opciones[0] || LUGARES[0];
  });

  const [infoViaje, setInfoViaje] = useState(null);
  const [esperaInfo, setEsperaInfo] = useState(null); // caso sin taxis
  const [mensaje, setMensaje] = useState("");

  const solicitarViaje = async () => {
    try {
      setMensaje("");
      setInfoViaje(null);
      setEsperaInfo(null);

      const resp = await fetch("http://localhost:5000/viaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, destino })
      });

      const data = await resp.json();

      // Si ok === false pero 200 → no hay taxi ahora, solo tiempo de espera
      if (data.ok === false && data.motivo === "sin_taxis") {
        setEsperaInfo(data);
        setMensaje(
          data.mensaje ||
            "No hay taxis libres. Se estima un tiempo de espera aproximado."
        );
        return;
      }

      if (!resp.ok || data.ok === false) {
        setMensaje(data.mensaje || "No se pudo crear el viaje.");
        return;
      }

      // Viaje creado con taxi asignado
      setInfoViaje(data);
      setMensaje("Viaje creado. El taxista verá tu solicitud.");
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("Error al conectar con la API de UNIETAXI.");
    }
  };

  const cancelarViaje = async () => {
    if (!infoViaje) return;
    try {
      setMensaje("");
      const resp = await fetch("http://localhost:5000/viaje/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje: infoViaje.id_viaje })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "No se pudo cancelar el viaje.");
        return;
      }
      setMensaje("Has cancelado el viaje.");
      setInfoViaje(null);
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("Error al cancelar el viaje.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Columna izquierda */}
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

          {/* Caso: no hay taxis libres → se muestra estimación de espera */}
          {esperaInfo && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px",
                borderRadius: "12px",
                backgroundColor: "#020617",
                border: "1px dashed #eab30880",
                fontSize: "13px"
              }}
            >
              <p style={{ margin: 0 }}>
                No hay taxis libres ahora mismo en {origen}.
              </p>
              <p style={{ margin: 0 }}>
                Tiempo de espera estimado:{" "}
                <strong>{esperaInfo.tiempo_espera_min} minutos</strong>.
              </p>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                Puedes volver a intentarlo más tarde.
              </p>
            </div>
          )}

          {/* Caso: viaje creado con taxi asignado */}
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
                Duración simulada del viaje: {infoViaje.duracion_min} minutos.
              </p>

              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                <button
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "default",
                    fontSize: "12px",
                    backgroundColor: "#16a34a",
                    color: "#020617",
                    fontWeight: 600
                  }}
                >
                  Confirmado
                </button>
                <button
                  onClick={cancelarViaje}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    fontWeight: 600
                  }}
                >
                  Cancelar viaje
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Columna derecha: taxis activos */}
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
