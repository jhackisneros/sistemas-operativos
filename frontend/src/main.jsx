// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import "./index.css";

const path = window.location.pathname;

function Root() {
  // Si entras a http://localhost:5173/admin → carga el panel de admin
  if (path.startsWith("/admin")) {
    return <AdminPanel />;
  }

  // Cualquier otra ruta → app normal (pasajero / taxista)
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
