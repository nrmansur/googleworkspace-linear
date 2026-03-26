import axios from "axios";
import { getSetting } from "./settingsService";

/**
 * Sends a message back to a Google Chat space/thread.
 * Requires a service account with Chat API access.
 */
export async function replyToThread(
  spaceId: string,
  threadKey: string,
  message: string
): Promise<void> {
  const serviceAccountKey = await getSetting("google_service_account_key");
  if (!serviceAccountKey) {
    console.warn("Google service account not configured; skipping reply.");
    return;
  }

  // In production, use google-auth-library to get an OAuth2 token
  // from the service account. For now, we use a stored access token.
  const accessToken = await getSetting("google_chat_token");
  if (!accessToken) {
    console.warn("Google Chat access token not configured; skipping reply.");
    return;
  }

  await axios.post(
    `https://chat.googleapis.com/v1/spaces/${spaceId}/messages`,
    {
      text: message,
      thread: { threadKey },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}
