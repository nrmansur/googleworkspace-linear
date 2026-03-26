# GoogleWorkspace-Linear Integration

Automated Linear ticket creation via Google Workspace `/bugfix` command with Claude CLI AI integration.

## Architecture

- **Backend**: Node.js + TypeScript + Express
- **Database**: MongoDB
- **Frontend**: React + TypeScript
- **AI**: Claude CLI for thread analysis
- **Integration**: Linear API for ticket creation

## How It Works

1. A user types `/bugfix` in a Google Workspace Chat thread
2. Google sends a webhook to our backend with the thread context
3. Claude CLI analyzes the conversation and generates a structured bug report
4. A Linear ticket is created automatically with the AI-generated description
5. The Linear ticket link is posted back to the Google Chat thread

## Setup

### Prerequisites

- Node.js 18+
- MongoDB instance
- Google Workspace admin access (for slash command setup)
- Linear API key
- Claude CLI installed

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials (or use the Admin UI after first run)
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The admin dashboard runs on `http://localhost:3000` and the backend API on `http://localhost:4000`.

## Google Workspace Setup

1. Create a Google Chat App in the Google Cloud Console
2. Set the HTTP endpoint to `https://your-domain.com/api/google/webhook`
3. Register the `/bugfix` slash command
4. Deploy and install the app to your workspace

## Admin Dashboard

The web UI lets you:
- Configure Linear API tokens, Google webhook secrets, and AI parameters
- View ticket creation statistics and success/failure rates
- Browse recent activity logs
