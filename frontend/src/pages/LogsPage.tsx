import React, { useEffect, useState } from "react";
import { getLogs } from "../services/api";
import { IntegrationLog, PaginatedLogs } from "../types";

const statusBadge = (status: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: status === "success" ? "#d4edda" : "#f8d7da",
  color: status === "success" ? "#155724" : "#721c24",
});

const actionBadge = (action: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background:
    action === "ticket_created"
      ? "#cce5ff"
      : action === "ticket_failed"
      ? "#f8d7da"
      : action === "ai_processed"
      ? "#e2d9f3"
      : "#fff3cd",
  color:
    action === "ticket_created"
      ? "#004085"
      : action === "ticket_failed"
      ? "#721c24"
      : action === "ai_processed"
      ? "#4a235a"
      : "#856404",
});

const btnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.85rem",
};

export default function LogsPage() {
  const [data, setData] = useState<PaginatedLogs | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const fetchLogs = (p: number) => {
    getLogs(p)
      .then((d) => {
        setData(d);
        setPage(p);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Activity Logs</h1>
        <span style={{ color: "#666" }}>{data.pagination.total} total entries</span>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th style={{ padding: "0.75rem 1rem" }}>Time</th>
              <th style={{ padding: "0.75rem 1rem" }}>Action</th>
              <th style={{ padding: "0.75rem 1rem" }}>Status</th>
              <th style={{ padding: "0.75rem 1rem" }}>Thread ID</th>
              <th style={{ padding: "0.75rem 1rem" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log: IntegrationLog) => (
              <tr key={log._id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={actionBadge(log.action)}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={statusBadge(log.status)}>{log.status}</span>
                </td>
                <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {log.threadId.substring(0, 20)}...
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  {log.linearIssueUrl ? (
                    <a
                      href={log.linearIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007bff" }}
                    >
                      {log.title}
                    </a>
                  ) : (
                    log.errorMessage || log.title || "—"
                  )}
                </td>
              </tr>
            ))}
            {data.logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                  No logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1}
            style={{ ...btnStyle, opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ padding: "0.5rem 1rem", lineHeight: "1.5" }}>
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= data.pagination.totalPages}
            style={{ ...btnStyle, opacity: page >= data.pagination.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
