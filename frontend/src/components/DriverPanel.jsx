import React from "react";

function DriverPanel({ taxis, clientes, asignaciones }) {
  // Para la demo, el taxi 0 es “yo”
  const taxiYo = taxis.length > 0 ? taxis[0] : null;

  const asignacionesTaxiYo = taxiYo
    ? asignaciones.filter((a) => a[1] === taxiYo.id)
    : [];

  const clientesDeTaxiYo = asignacionesTaxiYo
    .map((a) => clientes.find((c) => c.id === a[0]))
    .filter(Boolean);

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 3fr" }}>
      {/* Info del conductor */}
      <section>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vista taxista</h2>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "12px" }}>
          Simula la pantalla de un conductor afiliado a UNIETAXI.
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
          <h3 style={{ margin: 0, fontSize: "15px", marginBottom: "6px" }}>
            Tu estado como conductor
          </h3>

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
              <p style={{ marginTop: "8px", fontSize: "13px" }}>
                Viajes asignados en esta simulación:{" "}
                <strong>{asignacionesTaxiYo.length}</strong>
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "13px" }}>
              No hay taxis registrados en el sistema.
            </p>
          )}
        </div>
      </section>

      {/* Clientes asignados + tabla de servicios */}
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
