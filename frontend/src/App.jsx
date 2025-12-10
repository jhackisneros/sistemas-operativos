// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import PassengerPanel from "./components/PassengerPanel.jsx";
import DriverPanel from "./components/DriverPanel.jsx";

const API_URL = "http://localhost:5000";

function formatearHora(minutos) {
  const total = minutos % (24 * 60); // bucle de 24h
  const h = Math.floor(total / 60);
  const m = total % 60;
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad(h)}:${pad(m)}`;
}

function App() {
  const [rol, setRol] = useState("pasajero");
  const [datos, setDatos] = useState({
    taxis: [],
    clientes: [],
    asignaciones: [],
    viajes: [],
    minutos_simulados: 0,
    dias_simulados: 0,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarEstado = async () => {
    try {
      setCargando(true);
      setError("");
      const resp = await fetch(`${API_URL}/estado`);
      const json = await resp.json();

      if (!resp.ok) {
        setError(json.mensaje || "Error al consultar el estado de la API.");
        return;
      }

      setDatos({
        taxis: json.taxis || [],
        clientes: json.clientes || [],
        asignaciones: json.asignaciones || [],
        viajes: json.viajes || [],
        minutos_simulados: json.minutos_simulados ?? 0,
        dias_simulados: json.dias_simulados ?? 0,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo conectar con la API de UNIETAXI.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Carga inicial
    cargarEstado();
    // Auto-refresh cada 5 s para que el taxista vea “pop ups” de nuevos viajes
    const id = setInterval(cargarEstado, 5000);
    return () => clearInterval(id);
  }, []);

  const {
    taxis,
    clientes,
    asignaciones,
    viajes,
    minutos_simulados,
    dias_simulados,
  } = datos;

  const relojTexto = formatearHora(minutos_simulados);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Barra superior */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", marginBottom: "4px" }}>UNIETAXI</h1>
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Simulación concurrente · monitor + semáforos
          </p>
        </div>

        {/* Selector de rol */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#0b1120",
            borderRadius: "999px",
            padding: "4px",
            border: "1px solid #1f2937",
          }}
        >
          <button
            onClick={() => setRol("pasajero")}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "13px",
              backgroundColor: rol === "pasajero" ? "#22c55e" : "transparent",
              color: rol === "pasajero" ? "#020617" : "#e5e7eb",
              fontWeight: 600,
            }}
          >
            Soy pasajero
          </button>
          <button
            onClick={() => setRol("taxista")}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "13px",
              backgroundColor: rol === "taxista" ? "#22c55e" : "transparent",
              color: rol === "taxista" ? "#020617" : "#e5e7eb",
              fontWeight: 600,
            }}
          >
            Soy taxista
          </button>
        </div>

        {/* Reloj simulado (siempre el mismo, da igual qué rol elijas) */}
        <div
          style={{
            textAlign: "right",
            fontSize: "13px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "6px 10px",
            border: "1px solid #1f2937",
            minWidth: "140px",
          }}
        >
          <div style={{ opacity: 0.7 }}>Día simulado</div>
          <div style={{ fontWeight: 600 }}>Día {dias_simulados}</div>
          <div style={{ marginTop: "2px", opacity: 0.8 }}>Hora</div>
          <div style={{ fontWeight: 600 }}>{relojTexto}</div>
        </div>
      </header>

      {/* Mensaje de error global */}
      {error && (
        <div
          style={{
            marginBottom: "12px",
            backgroundColor: "#450a0a",
            borderRadius: "8px",
            padding: "8px 10px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* Botón manual de refresco */}
      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={cargarEstado}
          disabled={cargando}
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid #1f2937",
            backgroundColor: cargando ? "#0f172a" : "#111827",
            color: "#e5e7eb",
            cursor: cargando ? "default" : "pointer",
            fontSize: "13px",
          }}
        >
          {cargando ? "Actualizando..." : "Actualizar estado ahora"}
        </button>
      </div>

      {/* Panel principal dependiendo del rol */}
      <main>
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

export default App;
