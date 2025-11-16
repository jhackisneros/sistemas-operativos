// frontend/src/components/DriverPanel.jsx
import React, { useState } from "react";

function DriverPanel({ taxis, clientes, asignaciones, viajes, onRefrescar }) {
  const [mensaje, setMensaje] = useState("");

  const taxiYo = taxis.length > 0 ? taxis[0] : null;

  const asignacionesTaxiYo = taxiYo
    ? asignaciones.filter((a) => a[1] === taxiYo.id)
    : [];

  const clientesDeTaxiYo = asignacionesTaxiYo
    .map((a) => clientes.find((c) => c.id === a[0]))
    .filter(Boolean);

  const viajesTaxiYo = taxiYo
    ? viajes.filter((v) => v.taxi_id === taxiYo.id)
    : [];

  const aplicarCierre = async () => {
    try {
      setMensaje("");
      const resp = await fetch("http://localhost:5000/cierre", {
        method: "POST"
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al aplicar cierre contable.");
        return;
      }
      setMensaje(
        "Cierre contable aplicado: se ha descontado el 20% de comisión a los taxis."
      );
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API para el cierre contable.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Info del conductor */}
      <section>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vista taxista</h2>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "12px" }}>
          Simula la pantalla de un conductor afiliado a UNIETAXI, con sus
          ganancias y el cierre contable (20% de comisión).
        </p>

        <div
          style={{
            background:
              "radial-gradient(circle at top left, #3b82f633, transparent 60%)",
            borderRadius: "16px",
            padding: "14px",
            border: "1px solid #1f2937"
          }}
        >
          {taxiYo ? (
            <>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Taxi #{taxiYo.id} – Rating {taxiYo.rating} ⭐
              </p>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                Posición aprox: ({taxiYo.x.toFixed(2)}, {taxiYo.y.toFixed(2)})
              </p>
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "13px",
                  color: taxiYo.ocupado ? "#f97316" : "#22c55e"
                }}
              >
                Estado: {taxiYo.ocupado ? "Ocupado con un servicio" : "Disponible"}
              </p>

              <div
                style={{
                  marginTop: "10px",
                  padding: "8px",
                  borderRadius: "12px",
                  backgroundColor: "#020617",
                  border: "1px solid #1f2937",
                  fontSize: "13px"
                }}
              >
                <p style={{ margin: 0 }}>
                  Facturación del día (bruto):{" "}
                  <strong>{taxiYo.total_bruto.toFixed(2)} €</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Total recibido (neto, tras comisiones):{" "}
                  <strong>{taxiYo.total_neto.toFixed(2)} €</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Comisión total pagada a UNIETAXI:{" "}
                  <strong>{taxiYo.total_comision.toFixed(2)} €</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Viajes realizados:{" "}
                  <strong>{taxiYo.viajes_realizados}</strong>
                </p>
              </div>

              <button
                onClick={aplicarCierre}
                style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  backgroundColor: "#f97316",
                  color: "#020617",
                  fontWeight: 600
                }}
              >
                Simular cierre contable (24h → 5 min)
              </button>

              {mensaje && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#fbbf24" }}>
                  {mensaje}
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "13px" }}>
              No hay taxis registrados en el sistema.
            </p>
          )}
        </div>
      </section>

      {/* Clientes + viajes */}
      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>
          Tus clientes asignados
        </h3>

        {taxiYo && clientesDeTaxiYo.length === 0 && (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            De momento no tienes ningún cliente asignado en la simulación.
          </p>
        )}

        {clienteRows(clientesDeTaxiYo, taxiYo)}

        <h3 style={{ fontSize: "15px", marginTop: "16px", marginBottom: "6px" }}>
          Tus viajes (origen / destino / tarifa)
        </h3>

        {taxiYo && viajesTaxiYo.length === 0 && (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Aún no has realizado viajes desde la vista pasajero.
          </p>
        )}

        {viajesTaxiYo.length > 0 && (
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              padding: "10px",
              maxHeight: "200px",
              overflowY: "auto",
              marginBottom: "10px"
            }}
          >
            {viajesTaxiYo.map((v, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 4px",
                  borderBottom: "1px solid #111827",
                  fontSize: "13px"
                }}
              >
                <div>
                  <div>
                    {v.origen} → {v.destino}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>
                    Duración: {v.duracion_min} min
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>
                    <strong>{v.tarifa.toFixed(2)} €</strong>
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>
                    Distancia: {v.distancia_aprox_km} km
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: "15px", marginTop: "8px", marginBottom: "6px" }}>
          Vista rápida de todos los servicios
        </h3>
        {asignaciones.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>No hay servicios aún.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "13px",
              backgroundColor: "#020617",
              borderRadius: "12px",
              overflow: "hidden"
            }}
          >
            <thead>
              <tr>
                <th style={thEstilo}>Cliente</th>
                <th style={thEstilo}>Taxi</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a, idx) => (
                <tr key={idx}>
                  <td style={tdEstilo}>Cliente #{a[0]}</td>
                  <td style={tdEstilo}>Taxi #{a[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function clienteRows(clientes, taxiYo) {
  if (!taxiYo || clientes.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#020617",
        borderRadius: "16px",
        border: "1px solid #1f2937",
        padding: "10px",
        maxHeight: "220px",
        overflowY: "auto",
        marginBottom: "8px"
      }}
    >
      {clientes.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 4px",
            borderBottom: "1px solid #111827",
            fontSize: "13px"
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Cliente #{c.id}</div>
            <div style={{ opacity: 0.7 }}>
              Posición: ({c.x.toFixed(2)}, {c.y.toFixed(2)})
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px", opacity: 0.8 }}>
            Asignado a tu taxi #{taxiYo.id}
          </div>
        </div>
      ))}
    </div>
  );
}

const thEstilo = {
  borderBottom: "1px solid #111827",
  padding: "6px",
  textAlign: "left",
  backgroundColor: "#020617"
};

const tdEstilo = {
  borderBottom: "1px solid #111827",
  padding: "6px"
};

export default DriverPanel;
