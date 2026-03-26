import React, { useEffect, useState } from "react";
import { getStats } from "../services/api";
import { Stats, IntegrationLog } from "../types";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  textAlign: "center",
};

const statNumber: React.CSSProperties = {
  fontSize: "2.5rem",
  fontWeight: 700,
  margin: "0.5rem 0",
};

const statusBadge = (status: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: status === "success" ? "#d4edda" : "#f8d7da",
  color: status === "success" ? "#155724" : "#721c24",
});

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "#666" }}>Tickets Created</div>
          <div style={{ ...statNumber, color: "#28a745" }}>
            {stats.ticketsCreated}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#666" }}>Tickets Failed</div>
          <div style={{ ...statNumber, color: "#dc3545" }}>
            {stats.ticketsFailed}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#666" }}>Webhooks Received</div>
          <div style={{ ...statNumber, color: "#007bff" }}>
            {stats.webhooksReceived}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#666" }}>Success Rate</div>
          <div style={{ ...statNumber, color: "#6f42c1" }}>
            {stats.successRate}%
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem" }}>Recent Activity</h2>
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th style={{ padding: "0.75rem 1rem" }}>Time</th>
              <th style={{ padding: "0.75rem 1rem" }}>Action</th>
              <th style={{ padding: "0.75rem 1rem" }}>Status</th>
              <th style={{ padding: "0.75rem 1rem" }}>Title / Details</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentLogs.map((log: IntegrationLog) => (
              <tr
                key={log._id}
                style={{ borderTop: "1px solid #eee" }}
              >
                <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {log.action.replace(/_/g, " ")}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={statusBadge(log.status)}>{log.status}</span>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {log.title || log.errorMessage || log.threadId}
                </td>
              </tr>
            ))}
            {stats.recentLogs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{ padding: "2rem", textAlign: "center", color: "#999" }}
                >
                  No activity yet. Use /bugfix in Google Chat to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
