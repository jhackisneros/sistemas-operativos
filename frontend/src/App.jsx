// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import PassengerPanel from "./components/PassengerPanel.jsx";
import DriverPanel from "./components/DriverPanel.jsx";

const API_URL = "http://localhost:5000";

// 24h simuladas en bucle, a partir de minutos_simulados
function formatearHora(minutos) {
  const total = minutos % (24 * 60); // bucle de 24 horas
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
    dias_simulados: 0, // lo seguimos guardando por si lo usas en el informe, pero NO lo pintamos
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
    // Auto-refresh cada 5 s para que se actualicen taxis, viajes, etc.
    const id = setInterval(cargarEstado, 5000);
    return () => clearInterval(id);
  }, []);

  const {
    taxis,
    clientes,
    asignaciones,
    viajes,
    minutos_simulados,
    // dias_simulados,  // si lo quieres en algún momento lo tienes aquí
  } = datos;

  const relojTexto = formatearHora(minutos_simulados);

  // ---------- Datos para las tarjetitas de resumen ----------
  const totalTaxis = taxis.length;
  const taxisLibres = taxis.filter((t) => !t.ocupado).length;
  const taxisOcupados = totalTaxis - taxisLibres;

  const totalViajes = viajes.length;
  const viajesActivos = viajes.filter(
    (v) => v.estado === "pendiente" || v.estado === "aceptado"
  ).length;
  const viajesFinalizados = viajes.filter(
    (v) => v.estado === "finalizado"
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: "16px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", marginBottom: "4px" }}>UNIETAXI</h1>
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Simulación de clientes y taxis con hilos, monitor y semáforos
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

        {/* Reloj simulado (EL MISMO DE SIEMPRE, sin días) */}
        <div
          style={{
            textAlign: "right",
            fontSize: "13px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "6px 10px",
            border: "1px solid #1f2937",
            minWidth: "150px",
          }}
        >
          <div style={{ opacity: 0.7 }}>Hora simulada</div>
          <div style={{ fontWeight: 600, fontSize: "16px" }}>{relojTexto}</div>
          <div style={{ marginTop: "2px", opacity: 0.6, fontSize: "11px" }}>
            24h del día se recorren en pocos minutos reales
          </div>
        </div>
      </header>

      {/* Tarjetitas de resumen (taxis / viajes) */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            flex: "1 1 120px",
            minWidth: "140px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #1f2937",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Taxis totales</div>
          <div style={{ fontSize: "18px", fontWeight: 600 }}>{totalTaxis}</div>
        </div>

        <div
          style={{
            flex: "1 1 120px",
            minWidth: "140px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #1f2937",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Taxis libres</div>
          <div style={{ fontSize: "18px", fontWeight: 600 }}>{taxisLibres}</div>
        </div>

        <div
          style={{
            flex: "1 1 120px",
            minWidth: "140px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #1f2937",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Taxis ocupados</div>
          <div style={{ fontSize: "18px", fontWeight: 600 }}>
            {taxisOcupados}
          </div>
        </div>

        <div
          style={{
            flex: "1 1 160px",
            minWidth: "160px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #1f2937",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Viajes activos</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            {viajesActivos}{" "}
            <span style={{ fontSize: "11px", opacity: 0.7 }}>
              / {totalViajes} totales
            </span>
          </div>
          <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
            Finalizados: {viajesFinalizados}
          </div>
        </div>
      </section>

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
