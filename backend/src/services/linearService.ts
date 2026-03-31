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

export async function uploadFileToLinear(
  filename: string,
  contentType: string,
  fileBuffer: Buffer
): Promise<string> {
  // Step 1: Request upload URL from Linear (must include headers field)
  const query = `
    mutation FileUpload($size: Int!, $contentType: String!, $filename: String!) {
      fileUpload(size: $size, contentType: $contentType, filename: $filename) {
        success
        uploadFile {
          uploadUrl
          assetUrl
          headers {
            key
            value
          }
        }
      }
    }
  `;

  const data = await linearRequest(query, {
    size: fileBuffer.length,
    contentType,
    filename,
  });

  if (!data.fileUpload.success) {
    throw new Error("Failed to get Linear upload URL");
  }

  const { uploadUrl, assetUrl, headers: uploadHeaders } = data.fileUpload.uploadFile;

  console.log(`[Linear Upload] assetUrl: ${assetUrl}`);
  console.log(`[Linear Upload] uploadUrl: ${uploadUrl?.substring(0, 100)}...`);
  console.log(`[Linear Upload] headers: ${JSON.stringify(uploadHeaders)}`);

  // Step 2: Upload the file to the presigned URL with required headers
  const putHeaders: Record<string, string> = {};
  for (const h of uploadHeaders || []) {
    putHeaders[h.key] = h.value;
  }
  // Don't override Content-Type if already provided by Linear headers
  if (!putHeaders["Content-Type"] && !putHeaders["content-type"]) {
    putHeaders["Content-Type"] = contentType;
  }
  putHeaders["Content-Length"] = String(fileBuffer.length);

  const uploadResponse = await axios.put(uploadUrl, fileBuffer, {
    headers: putHeaders,
    maxBodyLength: Infinity,
  });
  console.log(`[Linear Upload] PUT status: ${uploadResponse.status}`);

  return assetUrl;
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
