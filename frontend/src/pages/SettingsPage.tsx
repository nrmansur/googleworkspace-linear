import React, { useEffect, useState } from "react";
import { getSettings, updateSetting, getLinearTeams } from "../services/api";
import { SettingsMap, LinearTeam } from "../types";

const SETTING_FIELDS = [
  { key: "linear_api_key", label: "Linear API Key", type: "password", placeholder: "lin_api_..." },
  { key: "linear_team_id", label: "Linear Team ID", type: "text", placeholder: "Select after testing connection" },
  { key: "google_webhook_secret", label: "Google Webhook Secret", type: "password", placeholder: "Your webhook verification token" },
  { key: "google_service_account_key", label: "Google Service Account Key", type: "password", placeholder: "Service account JSON key" },
  { key: "google_chat_token", label: "Google Chat Access Token", type: "password", placeholder: "OAuth2 access token" },
  { key: "ai_model", label: "Claude AI Model", type: "text", placeholder: "sonnet (default)" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.8rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "0.9rem",
};

const btnStyle: React.CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.9rem",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      const vals: Record<string, string> = {};
      for (const f of SETTING_FIELDS) {
        vals[f.key] = s[f.key]?.encrypted ? "" : s[f.key]?.value || "";
      }
      setFormValues(vals);
    });
  }, []);

  const handleSave = async (key: string) => {
    const val = formValues[key];
    if (!val) return;
    setSaving(key);
    try {
      await updateSetting(key, val);
      setMessage(`Saved ${key}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (e: any) {
      setMessage(`Error saving ${key}: ${e.message}`);
    }
    setSaving(null);
  };

  const testLinearConnection = async () => {
    try {
      const t = await getLinearTeams();
      setTeams(t);
      setMessage(`Connected! Found ${t.length} team(s).`);
      setTimeout(() => setMessage(""), 5000);
    } catch (e: any) {
      setMessage(`Connection failed: ${e.message}`);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Settings</h1>

      {message && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: message.includes("Error") || message.includes("failed") ? "#f8d7da" : "#d4edda",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {SETTING_FIELDS.map((field) => (
          <div
            key={field.key}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr auto",
              gap: "1rem",
              alignItems: "center",
              padding: "0.75rem 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {field.label}
              {settings[field.key]?.encrypted && (
                <span style={{ color: "#999", fontWeight: 400, fontSize: "0.75rem", display: "block" }}>
                  (encrypted)
                </span>
              )}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={formValues[field.key] || ""}
              onChange={(e) =>
                setFormValues({ ...formValues, [field.key]: e.target.value })
              }
              style={inputStyle}
            />
            <button
              onClick={() => handleSave(field.key)}
              disabled={saving === field.key}
              style={btnStyle}
            >
              {saving === field.key ? "Saving..." : "Save"}
            </button>
          </div>
        ))}

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <button onClick={testLinearConnection} style={{ ...btnStyle, background: "#6f42c1" }}>
            Test Linear Connection
          </button>

          {teams.length > 0 && (
            <select
              style={inputStyle}
              onChange={(e) => {
                setFormValues({ ...formValues, linear_team_id: e.target.value });
                updateSetting("linear_team_id", e.target.value);
              }}
              value={formValues.linear_team_id || ""}
            >
              <option value="">Select a team...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.key})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
