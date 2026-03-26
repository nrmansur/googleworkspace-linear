import axios from "axios";
import { getSetting } from "./settingsService";

const LINEAR_API_URL = "https://api.linear.app/graphql";

interface LinearIssueInput {
  title: string;
  description: string;
  teamId?: string;
  priority?: number;
  labelIds?: string[];
}

interface LinearIssueResult {
  id: string;
  identifier: string;
  url: string;
  title: string;
}

async function linearRequest(query: string, variables: Record<string, unknown> = {}) {
  const apiKey = await getSetting("linear_api_key");
  if (!apiKey) throw new Error("Linear API key not configured");

  const response = await axios.post(
    LINEAR_API_URL,
    { query, variables },
    {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.data.errors) {
    throw new Error(`Linear API error: ${JSON.stringify(response.data.errors)}`);
  }
  return response.data.data;
}

export async function createIssue(input: LinearIssueInput): Promise<LinearIssueResult> {
  const teamId = input.teamId || (await getSetting("linear_team_id"));
  if (!teamId) throw new Error("Linear team ID not configured");

  const query = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
          title
        }
      }
    }
  `;

  const variables = {
    input: {
      title: input.title,
      description: input.description,
      teamId,
      priority: input.priority || 0,
      labelIds: input.labelIds || [],
    },
  };

  const data = await linearRequest(query, variables);

  if (!data.issueCreate.success) {
    throw new Error("Failed to create Linear issue");
  }

  return data.issueCreate.issue;
}

export async function getTeams() {
  const query = `
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;
  const data = await linearRequest(query);
  return data.teams.nodes;
}

export async function getLabels(teamId: string) {
  const query = `
    query($teamId: String!) {
      issueLabels(filter: { team: { id: { eq: $teamId } } }) {
        nodes {
          id
          name
          color
        }
      }
    }
  `;
  const data = await linearRequest(query, { teamId });
  return data.issueLabels.nodes;
}
