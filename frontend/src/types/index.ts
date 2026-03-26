export interface SettingsMap {
  [key: string]: { value: string; encrypted: boolean };
}

export interface IntegrationLog {
  _id: string;
  action: "ticket_created" | "ticket_failed" | "webhook_received" | "ai_processed";
  status: "success" | "failure";
  threadId: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
  title?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Stats {
  ticketsCreated: number;
  ticketsFailed: number;
  webhooksReceived: number;
  successRate: string;
  recentLogs: IntegrationLog[];
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface PaginatedLogs {
  logs: IntegrationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
