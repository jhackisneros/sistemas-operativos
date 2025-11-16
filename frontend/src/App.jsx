// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import PassengerPanel from "./components/PassengerPanel";
import DriverPanel from "./components/DriverPanel";

function App() {
  const [rol, setRol] = useState("pasajero");
  const [datos, setDatos] = useState({
    taxis: [],
    clientes: [],
    asignaciones: [],
    viajes: []
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarEstado = async () => {
    try {
      setCargando(true);
      setError("");
      const resp = await fetch("http://localhost:5000/estado");
      if (!resp.ok) throw new Error("Error HTTP");
      const json = await resp.json();
      setDatos({
        taxis: json.taxis || [],
        clientes: json.clientes || [],
        asignaciones: json.asignaciones || [],
        viajes: json.viajes || []
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo conectar con el backend (API UNIETAXI).");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstado();
    const id = setInterval(cargarEstado, 5000);
    return () => clearInterval(id);
  }, []);

  const { taxis, clientes, asignaciones, viajes } = datos;

  const taxisLibres = taxis.filter((t) => !t.ocupado).length;
  const taxisOcupados = taxis.filter((t) => t.ocupado).length;
  const numeroViajes = viajes.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "white",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #1f2937",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>
            UNIETAXI – Simulador de recursos críticos
          </h1>
          <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
            Monitor en Python + hilos + semáforos · Frontend React
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setRol("pasajero")}
            style={rol === "pasajero" ? botonActivo : botonInactivo}
          >
            Soy pasajero
          </button>
          <button
            onClick={() => setRol("taxista")}
            style={rol === "taxista" ? botonActivo : botonInactivo}
          >
            Soy taxista
          </button>
          <button
            onClick={cargarEstado}
            disabled={cargando}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #374151",
              backgroundColor: "transparent",
              color: "white",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            {cargando ? "Actualizando..." : "Actualizar estado"}
          </button>
        </div>
      </header>

      <main style={{ padding: "16px 24px" }}>
        <section
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap"
          }}
        >
          <CardResumen titulo="Taxis libres" valor={taxisLibres} />
          <CardResumen titulo="Taxis ocupados" valor={taxisOcupados} />
          <CardResumen titulo="Viajes totales" valor={numeroViajes} />
        </section>

        {error && (
          <p
            style={{
              fontSize: "13px",
              color: "#f97316",
              marginBottom: "12px"
            }}
          >
            {error}
          </p>
        )}

        {rol === "pasajero" ? (
          <PassengerPanel
            taxis={taxis}
            clientes={clientes}
            asignaciones={asignaciones}
            viajes={viajes}
            onRefrescar={cargarEstado}
          />
        ) : (
          <DriverPanel
            taxis={taxis}
            clientes={clientes}
            asignaciones={asignaciones}
            viajes={viajes}
            onRefrescar={cargarEstado}
          />
        )}
      </main>
    </div>
  );
}

function CardResumen({ titulo, valor }) {
  return (
    <div
      style={{
        minWidth: "140px",
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid #1f2937",
        backgroundColor: "#020617"
      }}
    >
      <div style={{ fontSize: "11px", opacity: 0.7 }}>{titulo}</div>
      <div style={{ fontSize: "18px", fontWeight: 600 }}>{valor}</div>
    </div>
  );
}

const botonActivo = {
  padding: "6px 10px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#22c55e",
  color: "#020617",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer"
};

const botonInactivo = {
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid #374151",
  backgroundColor: "transparent",
  color: "white",
  fontSize: "12px",
  cursor: "pointer"
};

export default App;
