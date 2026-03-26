import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import LogsPage from "./pages/LogsPage";

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  padding: "1rem 2rem",
  background: "#1a1a2e",
  color: "#fff",
  alignItems: "center",
};

const linkStyle: React.CSSProperties = {
  color: "#aaa",
  textDecoration: "none",
  padding: "0.5rem 1rem",
  borderRadius: "6px",
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "#fff",
  background: "#16213e",
};

export default function App() {
  return (
    <BrowserRouter>
      <nav style={navStyle}>
        <strong style={{ marginRight: "2rem", fontSize: "1.1rem" }}>
          GWorkspace → Linear
        </strong>
        <NavLink
          to="/"
          end
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/settings"
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
        >
          Settings
        </NavLink>
        <NavLink
          to="/logs"
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
        >
          Logs
        </NavLink>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
