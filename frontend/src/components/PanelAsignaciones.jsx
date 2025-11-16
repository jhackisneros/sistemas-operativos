import React from "react";

function PanelAsignaciones({ taxis, clientes, asignaciones }) {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* ASIGNACIONES */}
      <section>
        <h2>Asignaciones Cliente → Taxi</h2>
        {asignaciones.length === 0 ? (
          <p style={{ fontSize: "14px" }}>No hay asignaciones todavía.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "14px",
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
                  <td style={tdEstilo}>{a[0]}</td>
                  <td style={tdEstilo}>{a[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* TAXIS */}
      <section>
        <h2>Taxis</h2>
        {taxis.length === 0 ? (
          <p style={{ fontSize: "14px" }}>No hay taxis registrados.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr>
                <th style={thEstilo}>ID</th>
                <th style={thEstilo}>Posición (x, y)</th>
                <th style={thEstilo}>Rating</th>
                <th style={thEstilo}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {taxis.map((t) => (
                <tr key={t.id}>
                  <td style={tdEstilo}>{t.id}</td>
                  <td style={tdEstilo}>
                    ({t.x.toFixed(2)}, {t.y.toFixed(2)})
                  </td>
                  <td style={tdEstilo}>{t.rating}</td>
                  <td style={tdEstilo}>{t.ocupado ? "Ocupado" : "Libre"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* CLIENTES */}
      <section>
        <h2>Clientes</h2>
        {clientes.length === 0 ? (
          <p style={{ fontSize: "14px" }}>No hay clientes registrados.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr>
                <th style={thEstilo}>ID</th>
                <th style={thEstilo}>Posición (x, y)</th>
                <th style={thEstilo}>¿Tiene taxi?</th>
                <th style={thEstilo}>Taxi asignado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td style={tdEstilo}>{c.id}</td>
                  <td style={tdEstilo}>
                    ({c.x.toFixed(2)}, {c.y.toFixed(2)})
                  </td>
                  <td style={tdEstilo}>{c.tiene_taxi ? "Sí" : "No"}</td>
                  <td style={tdEstilo}>
                    {c.taxi_id !== null && c.taxi_id !== undefined
                      ? c.taxi_id
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const thEstilo = {
  border: "1px solid #ccc",
  padding: "6px",
  textAlign: "left",
  backgroundColor: "#f0f0f0",
};

const tdEstilo = {
  border: "1px solid #ccc",
  padding: "6px",
};

export default PanelAsignaciones;
