import React, { useEffect, useState } from "react";
import PanelAsignaciones from "./components/PanelAsignaciones";

function App() {
  const [datos, setDatos] = useState({
    taxis: [],
    clientes: [],
    asignaciones: []
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarEstado = async () => {
    try {
      setCargando(true);
      setError("");
      const resp = await fetch("http://localhost:5000/estado");
      if (!resp.ok) {
        throw new Error("Error al obtener el estado del backend");
      }
      const json = await resp.json();
      setDatos({
        taxis: json.taxis || [],
        clientes: json.clientes || [],
        asignaciones: json.asignaciones || []
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
  }, []);

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        padding: "20px",
        maxWidth: "900px",
        margin: "0 auto"
      }}
    >
      <h1>UNIETAXI – Panel simple</h1>
      <button onClick={cargarEstado} disabled={cargando}>
        {cargando ? "Actualizando..." : "Actualizar estado"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <PanelAsignaciones
        taxis={datos.taxis}
        clientes={datos.clientes}
        asignaciones={datos.asignaciones}
      />
    </div>
  );
}

export default App;
