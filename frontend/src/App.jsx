// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import PassengerPanel from "./components/PassengerPanel.jsx";
import DriverPanel from "./components/DriverPanel.jsx";

function App() {
  const [datos, setDatos] = useState({
    taxis: [],
    clientes: [],
    asignaciones: [],
    viajes: []
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [rol, setRol] = useState("pasajero"); // "pasajero" o "taxista"

  // Reloj simulado: cada tick = 5 minutos
  const [simTick, setSimTick] = useState(0); // 1 tick = 5 minutos simulados

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
  }, []);

  const { taxis, clientes, asignaciones, viajes } = datos;

  // ------------------ Reloj simulado (solo visual) ------------------

  useEffect(() => {
    const id = setInterval(() => {
      setSimTick((t) => t + 1);
    }, 1000); // cada segundo = 5 minutos simulados
    return () => clearInterval(id);
  }, []);

  const minutosSimulados = (simTick * 5) % (24 * 60); // 24h = 1440 min
  const horas = Math.floor(minutosSimulados / 60);
  const mins = minutosSimulados % 60;
  const horaSimuladaStr =
    horas.toString().padStart(2, "0") + ":" + mins.toString().padStart(2, "0");

  // ------------------ Métricas resumen ------------------

  const taxisLibres = taxis.filter((t) => !t.ocupado).length;
  const taxisOcupados = taxis.filter((t) => t.ocupado).length;
  const clientesConTaxi = clientes.filter((c) => c.tiene_taxi).length;
  const clientesSinTaxi = clientes.filter((c) => !c.tiene_taxi).length;

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #020617 40%, #111827 100%)",
        color: "white",
        padding: "20px"
      }}
    >
      {/* Navbar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "24px" }}>UNIETAXI</h1>
          <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>
            Simulador tipo Uber (pasajero / taxista)
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
            <button
              onClick={() => setRol("pasajero")}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                background: rol === "pasajero" ? "#22c55e" : "#1f2937",
                color: "white"
              }}
            >
              Soy pasajero
            </button>
            <button
              onClick={() => setRol("taxista")}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                background: rol === "taxista" ? "#3b82f6" : "#1f2937",
                color: "white"
              }}
            >
              Soy taxista
            </button>
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            Hora simulada: <strong>{horaSimuladaStr}</strong>
          </div>
        </div>
      </header>

      {/* Barra acciones */}
      <section
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <button
          onClick={cargarEstado}
          disabled={cargando}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            background: "#fbbf24",
            color: "#111827",
            fontWeight: 600
          }}
        >
          {cargando ? "Actualizando..." : "Actualizar estado"}
        </button>

        {error && (
          <span style={{ color: "#f97316", fontSize: "13px" }}>{error}</span>
        )}
      </section>

      {/* Tarjetas resumen */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <ResumenCard
          titulo="Taxis libres"
          valor={taxisLibres}
          color="#22c55e"
        />
        <ResumenCard
          titulo="Taxis ocupados"
          valor={taxisOcupados}
          color="#ef4444"
        />
        <ResumenCard
          titulo="Clientes con taxi"
          valor={clientesConTaxi}
          color="#38bdf8"
        />
        <ResumenCard
          titulo="Clientes esperando"
          valor={clientesSinTaxi}
          color="#eab308"
        />
      </section>

      {/* Panel central: o pasajero o taxista */}
      <main
        style={{
          backgroundColor: "#020617",
          borderRadius: "18px",
          padding: "18px",
          border: "1px solid #1f2937",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
        }}
      >
        {rol === "pasajero" ? (
          <PassengerPanel
            taxis={taxis}
            clientes={clientes}
            asignaciones={asignaciones}
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

function ResumenCard({ titulo, valor, color }) {
  return (
    <div
      style={{
        background: "#020617",
        borderRadius: "14px",
        padding: "10px 12px",
        border: "1px solid #1f2937"
      }}
    >
      <p style={{ margin: 0, fontSize: "12px", opacity: 0.7 }}>{titulo}</p>
      <p
        style={{
          margin: 0,
          marginTop: "4px",
          fontSize: "20px",
          fontWeight: 700
        }}
      >
        <span style={{ color }}>{valor}</span>
      </p>
    </div>
  );
}

export default App;
