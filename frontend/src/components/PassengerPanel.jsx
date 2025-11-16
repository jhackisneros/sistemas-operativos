import React from "react";

function PassengerPanel({ taxis, clientes, asignaciones }) {
  // Para la demo, el primer cliente es “yo”
  const clienteYo = clientes.length > 0 ? clientes[0] : null;

  let estadoTexto = "No hay cliente seleccionado.";
  let taxiAsignado = null;

  if (clienteYo) {
    const asignacion = asignaciones.find((a) => a[0] === clienteYo.id);
    if (asignacion) {
      taxiAsignado = taxis.find((t) => t.id === asignacion[1]);
      estadoTexto = `Tienes un taxi asignado (Taxi ${asignacion[1]}).`;
    } else {
      estadoTexto = "Todavía no tienes taxi asignado.";
    }
  }

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Panel “tu viaje” */}
      <section>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vista pasajero</h2>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "12px" }}>
          Simula la pantalla de un pasajero que ha pedido un UNIETAXI.
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
          <h3 style={{ margin: 0, fontSize: "15px", marginBottom: "6px" }}>
            Estado de tu viaje
          </h3>
          <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
            {clienteYo ? estadoTexto : "No hay datos de cliente en la simulación."}
          </p>

          {taxiAsignado && (
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
              <p style={{ margin: 0 }}>Taxi #{taxiAsignado.id}</p>
              <p style={{ margin: 0, opacity: 0.8 }}>
                Rating: {taxiAsignado.rating} ⭐
              </p>
              <p style={{ margin: 0, opacity: 0.7, fontSize: "12px" }}>
                Posición aprox: ({taxiAsignado.x.toFixed(2)},{" "}
                {taxiAsignado.y.toFixed(2)})
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Panel “taxis cercanos” */}
      <section>
        <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Taxis cercanos</h3>
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

export default PassengerPanel;
