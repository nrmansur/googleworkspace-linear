import React, { useEffect, useState } from "react";
import { getSettings, updateSetting, getLinearTeams } from "../services/api";
import { SettingsMap, LinearTeam } from "../types";

const SETTING_FIELDS = [
  { key: "linear_api_key", label: "Linear API Key", type: "password", placeholder: "lin_api_..." },
  { key: "linear_team_id", label: "Linear Team ID", type: "text", placeholder: "Select after testing connection" },
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

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  marginBottom: "1.5rem",
};

const stepNumberStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "#007bff",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.85rem",
  marginRight: "0.75rem",
  flexShrink: 0,
};

const stepRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  padding: "0.6rem 0",
};

const stepTextStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  lineHeight: "1.6",
  paddingTop: "2px",
};

const codeStyle: React.CSSProperties = {
  background: "#f1f3f5",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontSize: "0.82rem",
};

const guideHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  userSelect: "none",
};

const tipBoxStyle: React.CSSProperties = {
  background: "#fff3cd",
  border: "1px solid #ffc107",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontSize: "0.85rem",
  marginTop: "0.75rem",
  lineHeight: 1.5,
};

const successBoxStyle: React.CSSProperties = {
  background: "#d4edda",
  border: "1px solid #28a745",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  fontSize: "0.85rem",
  marginTop: "0.75rem",
  lineHeight: 1.5,
};

function GuideSection({
  title,
  color,
  defaultOpen,
  children,
}: {
  title: string;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={cardStyle}>
      <div style={guideHeaderStyle} onClick={() => setOpen(!open)}>
        <h2 style={{ fontSize: "1.1rem", color }}>{title}</h2>
        <span style={{ fontSize: "1.2rem", color: "#999" }}>{open ? "\u25B2" : "\u25BC"}</span>
      </div>
      {open && <div style={{ marginTop: "1rem" }}>{children}</div>}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={stepRowStyle}>
      <span style={stepNumberStyle}>{n}</span>
      <div style={stepTextStyle}>{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code style={codeStyle}>{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: "#1a1a2e",
        color: "#e0e0e0",
        padding: "1rem",
        borderRadius: "8px",
        fontSize: "0.82rem",
        overflowX: "auto",
        margin: "0.5rem 0",
        lineHeight: 1.6,
      }}
    >
      {children}
    </pre>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        const vals: Record<string, string> = {};
        for (const f of SETTING_FIELDS) {
          vals[f.key] = s[f.key]?.encrypted ? "" : s[f.key]?.value || "";
        }
        setFormValues(vals);
      })
      .catch(() => {
        setMessage("Database not connected — settings will be saved once MongoDB is available.");
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
      <h1 style={{ marginBottom: "0.5rem" }}>Settings</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Follow the guides below to set up each integration, then enter your credentials in the configuration form.
      </p>

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

      {/* ---- SETUP GUIDES ---- */}

      <GuideSection title="Guide 1: Prerequisites" color="#333" defaultOpen>
        <Step n={1}>
          <strong>Install MongoDB</strong> — Download and install from{" "}
          <a href="https://www.mongodb.com/try/download/community" target="_blank" rel="noopener noreferrer">mongodb.com</a>.
          On macOS you can also run:
          <CodeBlock>{`brew tap mongodb/brew\nbrew install mongodb-community\nbrew services start mongodb-community`}</CodeBlock>
        </Step>
        <Step n={2}>
          <strong>Install Claude CLI</strong> — Make sure the Claude CLI is installed and authenticated:
          <CodeBlock>{`npm install -g @anthropic-ai/claude-cli\nclaude auth login`}</CodeBlock>
        </Step>
        <Step n={3}>
          <strong>Start the backend server</strong> — From the project root:
          <CodeBlock>{`cd backend\nnpm install\ncp .env.example .env\nnpm run dev`}</CodeBlock>
        </Step>
        <Step n={4}>
          <strong>Start the frontend</strong> — In a separate terminal:
          <CodeBlock>{`cd frontend\nnpm install\nnpm start`}</CodeBlock>
        </Step>
        <div style={tipBoxStyle}>
          <strong>Tip:</strong> The backend runs on port 4000 and the frontend on port 3000.
          The frontend proxies API calls to the backend automatically.
        </div>
      </GuideSection>

      <GuideSection title="Guide 2: Linear API Setup" color="#6f42c1">
        <Step n={1}>
          Go to <a href="https://linear.app/settings/api" target="_blank" rel="noopener noreferrer">
          linear.app/settings/api</a> and click <strong>"Create key"</strong>.
        </Step>
        <Step n={2}>
          Give it a label like <Code>gworkspace-integration</Code> and click <strong>Create</strong>.
        </Step>
        <Step n={3}>
          Copy the generated API key (starts with <Code>lin_api_</Code>).
        </Step>
        <Step n={4}>
          Paste it into the <strong>Linear API Key</strong> field below and click <strong>Save</strong>.
        </Step>
        <Step n={5}>
          Click the <strong>"Test Linear Connection"</strong> button below the form. If successful,
          a team dropdown will appear — select your team to auto-save the Team ID.
        </Step>
        <div style={successBoxStyle}>
          <strong>How to verify:</strong> After saving the API key, click "Test Linear Connection".
          You should see "Connected! Found N team(s)." and a dropdown with your teams.
        </div>
      </GuideSection>

      <GuideSection title="Guide 3: Google Workspace Chat App Setup" color="#4285f4">
        <div style={successBoxStyle}>
          <strong>No service account key needed!</strong> Google Chat sends webhooks to our server
          and we reply directly in the HTTP response. No separate API credentials required.
        </div>
        <Step n={1}>
          Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
          Google Cloud Console</a> and create a new project (or select an existing one).
        </Step>
        <Step n={2}>
          Enable the <strong>Google Chat API</strong>: Navigate to{" "}
          <em>APIs &amp; Services &gt; Library</em>, search for "Google Chat API", and click <strong>Enable</strong>.
        </Step>
        <Step n={3}>
          Configure the Chat App: Go to the <a href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat" target="_blank" rel="noopener noreferrer">
          Google Chat API configuration page</a> and fill in:
          <ul style={{ margin: "0.5rem 0 0.5rem 1.5rem", lineHeight: 1.8 }}>
            <li><strong>App name:</strong> BugFix Bot</li>
            <li><strong>Avatar URL:</strong> (any icon URL)</li>
            <li><strong>Description:</strong> Creates Linear bug tickets from chat threads</li>
            <li><strong>Functionality:</strong> Check "Receive 1:1 messages" and "Join spaces and group conversations"</li>
            <li><strong>Connection settings:</strong> Select <strong>"HTTP endpoint URL"</strong> and enter your server URL:<br />
              <Code>https://your-domain.com/api/google/webhook</Code></li>
          </ul>
        </Step>
        <Step n={4}>
          Under <strong>Slash Commands</strong>, click "Add" and create:
          <ul style={{ margin: "0.5rem 0 0.5rem 1.5rem", lineHeight: 1.8 }}>
            <li><strong>Command ID:</strong> 1</li>
            <li><strong>Name:</strong> /bugfix</li>
            <li><strong>Description:</strong> Create a Linear bug ticket from this thread</li>
          </ul>
        </Step>
        <Step n={5}>
          Under <strong>Visibility</strong>, check "Make this Chat app available to specific people and groups"
          and add your email or team emails.
        </Step>
        <Step n={6}>
          Click <strong>Save</strong> at the bottom of the page. The app will be available in Google Chat shortly.
        </Step>
        <div style={tipBoxStyle}>
          <strong>Tip:</strong> For local development, use a tunnel like{" "}
          <a href="https://ngrok.com/" target="_blank" rel="noopener noreferrer">ngrok</a> to
          expose your local server:
          <CodeBlock>{`ngrok http 4000\n# Then use the ngrok URL as your webhook endpoint:\n# https://abc123.ngrok.io/api/google/webhook`}</CodeBlock>
        </div>
      </GuideSection>

      <GuideSection title="Guide 4: Testing the /bugfix Command" color="#28a745">
        <Step n={1}>
          Open <strong>Google Chat</strong> in your browser or app and go to any space where
          the BugFix Bot has been added.
        </Step>
        <Step n={2}>
          Start a conversation thread describing a bug. For example:
          <CodeBlock>{`Alice: The login page shows a 500 error after the latest deploy.\nBob: I can reproduce it — only happens with SSO accounts.\nAlice: The error log shows "session token undefined" in auth middleware.`}</CodeBlock>
        </Step>
        <Step n={3}>
          In the same thread, type <Code>/bugfix</Code> and press Enter.
        </Step>
        <Step n={4}>
          The bot will respond with a confirmation message containing the Linear ticket link, e.g.:
          <div style={{ ...successBoxStyle, marginTop: "0.5rem" }}>
            <strong>BugFix Bot:</strong> Bug ticket created!<br />
            <strong>ENG-142:</strong> Login page 500 error for SSO accounts after deploy<br />
            https://linear.app/your-org/issue/ENG-142
          </div>
        </Step>
        <Step n={5}>
          Click the link to verify the ticket in Linear. It should contain:
          <ul style={{ margin: "0.5rem 0 0 1.5rem", lineHeight: 1.8 }}>
            <li>AI-generated title</li>
            <li>Description with reproduction steps</li>
            <li>Expected vs. actual results</li>
            <li>Severity/priority assignment</li>
          </ul>
        </Step>
        <div style={tipBoxStyle}>
          <strong>Testing without Google Chat:</strong> You can also test the webhook directly with curl:
          <CodeBlock>{`curl -X POST http://localhost:4000/api/google/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "MESSAGE",
    "message": {
      "slashCommand": { "commandId": "1" },
      "text": "/bugfix",
      "argumentText": "Login page shows 500 error for SSO users after deploy. Reproduction: 1) Go to /login 2) Click SSO 3) See 500 error. Expected: redirect to dashboard.",
      "thread": { "name": "spaces/AAA/threads/BBB" },
      "name": "spaces/AAA/messages/CCC"
    },
    "space": { "name": "spaces/AAA" },
    "user": { "displayName": "Test User" }
  }'`}</CodeBlock>
        </div>
      </GuideSection>

      <GuideSection title="Guide 5: Monitoring & Troubleshooting" color="#dc3545">
        <Step n={1}>
          Go to the <strong>Dashboard</strong> tab to see real-time stats: tickets created,
          failures, webhooks received, and success rate.
        </Step>
        <Step n={2}>
          Go to the <strong>Logs</strong> tab to browse all activity. Each entry shows the action
          type, status, thread ID, and links to created Linear tickets.
        </Step>
        <Step n={3}>
          <strong>Common issues:</strong>
          <ul style={{ margin: "0.5rem 0 0 1.5rem", lineHeight: 1.8 }}>
            <li><strong>"Linear API key not configured"</strong> — Enter and save your API key above</li>
            <li><strong>"Linear team ID not configured"</strong> — Click "Test Linear Connection" and select a team</li>
            <li><strong>"Claude CLI error"</strong> — Make sure <Code>claude</Code> is installed and authenticated (<Code>claude auth login</Code>)</li>
            <li><strong>"MongoDB not available"</strong> — Start MongoDB locally or update the <Code>MONGODB_URI</Code> in <Code>.env</Code></li>
            <li><strong>Webhook not received</strong> — Check your ngrok tunnel is running and the URL matches the Google Chat config</li>
          </ul>
        </Step>
        <div style={tipBoxStyle}>
          <strong>Tip:</strong> Check the backend terminal for detailed error logs. The server uses <Code>morgan</Code> for
          request logging — every incoming request is printed to the console.
        </div>
      </GuideSection>

      {/* ---- CONFIGURATION FORM ---- */}

      <h2 style={{ marginBottom: "1rem", marginTop: "0.5rem" }}>Configuration</h2>

      <div style={cardStyle}>
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
