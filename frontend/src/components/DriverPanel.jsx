// frontend/src/components/DriverPanel.jsx
import React, { useState } from "react";

const API_URL = "http://localhost:5000";

function DriverPanel({ taxis, clientes, asignaciones, viajes, onRefrescar }) {
  const [mensaje, setMensaje] = useState("");

  // Para simplificar: el "taxista logueado" es siempre el Taxi #0 (si existe)
  const taxiYo = taxis.length > 0 ? taxis[0] : null;

  // Viajes asociados a ese taxi
  const viajesTaxiYo = taxiYo
    ? viajes.filter((v) => v.taxi_id === taxiYo.id)
    : [];

  const viajesPendientes = viajesTaxiYo.filter(
    (v) => v.estado === "pendiente"
  );
  const viajesAceptados = viajesTaxiYo.filter(
    (v) => v.estado === "aceptado"
  );
  const viajesFinalizados = viajesTaxiYo.filter(
    (v) => v.estado === "finalizado"
  );

  const aceptarViaje = async (id_viaje) => {
    try {
      setMensaje("");
      const resp = await fetch(`${API_URL}/viaje/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al aceptar el viaje.");
        return;
      }
      setMensaje("Has aceptado el viaje #" + id_viaje);
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al aceptar el viaje.");
    }
  };

  const finalizarViaje = async (id_viaje) => {
    try {
      setMensaje("");
      const resp = await fetch(`${API_URL}/viaje/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al finalizar el viaje.");
        return;
      }
      setMensaje("Has finalizado el viaje #" + id_viaje);
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al finalizar el viaje.");
    }
  };

  const aplicarCierre = async () => {
    try {
      setMensaje("");
      const resp = await fetch(`${API_URL}/cierre`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje || "Error al aplicar cierre contable.");
        return;
      }
      setMensaje("Cierre contable aplicado.");
      onRefrescar && onRefrescar();
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo conectar con la API al aplicar el cierre.");
    }
  };

  if (!taxiYo) {
    return (
      <div style={{ fontSize: "14px", opacity: 0.8 }}>
        No hay taxis registrados en el sistema.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "minmax(260px, 1.5fr) minmax(320px, 2fr)",
        alignItems: "flex-start",
      }}
    >
      {/* Columna izquierda: ficha del taxi */}
      <section>
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Vista taxista</h2>

        <div
          style={{
            backgroundColor: "#020617",
            borderRadius: "18px",
            border: "1px solid #1f2937",
            padding: "14px 16px",
          }}
        >
          <h3 style={{ marginBottom: "6px", fontSize: "15px" }}>
            Taxi #{taxiYo.id}
          </h3>
          <p style={{ fontSize: "13px", margin: "2px 0" }}>
            Posición aprox: ({taxiYo.x.toFixed(2)}, {taxiYo.y.toFixed(2)})
          </p>
          <p style={{ fontSize: "13px", margin: "2px 0" }}>
            Rating: ⭐ {taxiYo.rating}
          </p>
          <p style={{ fontSize: "13px", margin: "2px 0" }}>
            Estado:{" "}
            <span
              style={{
                color: taxiYo.ocupado ? "#f97316" : "#22c55e",
                fontWeight: 600,
              }}
            >
              {taxiYo.ocupado ? "Ocupado" : "Libre"}
            </span>
          </p>

          <hr
            style={{
              margin: "10px 0",
              borderColor: "#111827",
              opacity: 0.6,
            }}
          />

          <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
            <p>
              Facturación del día (bruto):{" "}
              <strong>{taxiYo.total_bruto.toFixed(2)} €</strong>
            </p>
            <p>
              Total recibido (neto, tras comisiones):{" "}
              <strong>{taxiYo.total_neto.toFixed(2)} €</strong>
            </p>
            <p>
              Comisión total pagada a UNIETAXI:{" "}
              <strong>{taxiYo.total_comision.toFixed(2)} €</strong>
            </p>
            <p>
              Viajes realizados: <strong>{taxiYo.viajes_realizados}</strong>
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
              backgroundColor: "#facc15",
              color: "#020617",
              fontWeight: 600,
            }}
          >
            Aplicar cierre contable (20 %)
          </button>

          {mensaje && (
            <p
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#fbbf24",
              }}
            >
              {mensaje}
            </p>
          )}
        </div>
      </section>

      {/* Columna derecha: viajes */}
      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>
          Viajes pendientes (nuevos pasajeros)
        </h3>
        {viajesPendientes.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No tienes viajes pendientes.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              padding: "10px",
              marginBottom: "10px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {viajesPendientes.map((v) => (
              <div
                key={v.id_viaje}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 4px",
                  borderBottom: "1px solid #111827",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div>
                    #{v.id_viaje} · {v.origen} → {v.destino}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>
                    Tarifa: {v.tarifa} € · {v.duracion_min} min
                  </div>
                </div>
                <button
                  onClick={() => aceptarViaje(v.id_viaje)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    backgroundColor: "#22c55e",
                    color: "#020617",
                    fontWeight: 600,
                  }}
                >
                  Aceptar
                </button>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>
          Viajes en curso / aceptados
        </h3>
        {viajesAceptados.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            No tienes viajes en curso.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              padding: "10px",
              marginBottom: "10px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {viajesAceptados.map((v) => (
              <div
                key={v.id_viaje}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 4px",
                  borderBottom: "1px solid #111827",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div>
                    #{v.id_viaje} · {v.origen} → {v.destino}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>
                    Tarifa: {v.tarifa} € · {v.duracion_min} min ·{" "}
                    {v.tiempo_restante} min restantes
                  </div>
                </div>
                <button
                  onClick={() => finalizarViaje(v.id_viaje)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    backgroundColor: "#f97316",
                    color: "#020617",
                    fontWeight: 600,
                  }}
                >
                  Finalizar
                </button>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>
          Viajes finalizados
        </h3>
        {viajesFinalizados.length === 0 ? (
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Aún no tienes viajes finalizados.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "16px",
              border: "1px solid #1f2937",
              padding: "10px",
              maxHeight: "180px",
              overflowY: "auto",
              fontSize: "13px",
            }}
          >
            {viajesFinalizados.map((v) => (
              <div
                key={v.id_viaje}
                style={{
                  padding: "4px 2px",
                  borderBottom: "1px solid #111827",
                }}
              >
                <div>
                  #{v.id_viaje} · {v.origen} → {v.destino}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>
                  Tarifa: {v.tarifa} € · {v.duracion_min} min ·{" "}
                  {v.rating_cliente
                    ? `Valoración: ${v.rating_cliente}⭐`
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

export default DriverPanel;
