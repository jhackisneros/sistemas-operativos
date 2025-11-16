// frontend/src/components/DriverPanel.jsx
import React, { useState } from "react";

function DriverPanel({ taxis, clientes, asignaciones, viajes, onRefrescar }) {
  const [mensaje, setMensaje] = useState("");

  // Simulamos que el taxista logueado es el taxi 0
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

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Columna izquierda: info del taxista */}
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

      {/* Columna derecha: viajes pendientes / aceptados / finalizados */}
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
              overflowY: "auto"
            }}
          >
            {viajesPendientes.map((v) => (
              <div
                key={v.id_viaje}
                style={{
                  display: "flex",
                  justifyContent: "space_between",
                  alignItems: "center",
                  padding: "6px 4px",
                  borderBottom: "1px solid #111827",
                  fontSize: "13px"
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
                    fontWeight: 600
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
              overflowY: "auto"
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
                  fontSize: "13px"
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
                  onClick={() => finalizarViaje(v.id_viaje)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    backgroundColor: "#f97316",
                    color: "#020617",
                    fontWeight: 600
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
            Todavía no hay viajes finalizados.
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
              overflowY: "auto"
            }}
          >
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
                  Tarifa: {v.tarifa} € · {v.duracion_min} min
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
