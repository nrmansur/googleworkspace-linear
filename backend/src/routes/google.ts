import { Router, Request, Response } from "express";
import axios from "axios";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { analyzeThread, ImageAttachment } from "../services/claudeService";
import { createIssue, uploadFileToLinear } from "../services/linearService";
import { IntegrationLog } from "../models/IntegrationLog";

export const googleRoutes = Router();

/** Whether the incoming request uses Google Chat API v2 new format */
function isNewFormat(body: any): boolean {
  return !!body.chat?.appCommandPayload;
}

/**
 * Wrap a text reply in the correct response format.
 * - New format (chat.appCommandPayload): requires ChatAppResponse wrapper
 * - Legacy format: plain { text } message object
 */
function chatResponse(body: any, text: string) {
  if (isNewFormat(body)) {
    return {
      hostAppDataAction: {
        chatDataAction: {
          createMessageAction: {
            message: { text },
          },
        },
      },
    };
  }
  return { text };
}

/**
 * Extracts the relevant fields from Google Chat's event payload.
 * Google Chat API v2 nests data under chat.appCommandPayload.
 */
function extractAttachments(msg: any): { name: string; contentName: string; contentType: string; downloadUri: string; thumbnailUri: string }[] {
  const attachments: any[] = msg?.attachment || msg?.attachments || [];
  return attachments.map((att: any) => ({
    name: att.name || att.filename || "attachment",
    contentName: att.contentName || att.filename || "attachment",
    contentType: att.contentType || att.mimeType || "",
    downloadUri: att.downloadUri || att.contentUri || att.attachmentDataRef?.resourceName || "",
    thumbnailUri: att.thumbnailUri || att.driveDataRef?.driveFileId || "",
  })).filter((a: any) => a.downloadUri || a.thumbnailUri);
}

function parseGoogleEvent(body: any) {
  // New format: chat.appCommandPayload
  const chatPayload = body.chat?.appCommandPayload;
  if (chatPayload) {
    const msg = chatPayload.message || {};
    const cmdMeta = chatPayload.appCommandMetadata || {};
    const slashCmd = msg.slashCommand || msg.annotations?.[0]?.slashCommand;
    const attachments = extractAttachments(msg);
    // Log raw attachment data for debugging
    if (msg.attachment || msg.attachments) {
      console.log(`[Webhook] Raw attachments:`, JSON.stringify(msg.attachment || msg.attachments, null, 2));
    }
    return {
      type: slashCmd ? "SLASH_COMMAND" : "MESSAGE",
      commandId: slashCmd?.commandId || cmdMeta.appCommandId,
      message: msg,
      user: body.chat?.user || msg.sender,
      space: chatPayload.space || msg.space,
      threadName: msg.thread?.name || msg.name,
      text: msg.text || msg.formattedText || "",
      argumentText: msg.argumentText || "",
      attachments,
    };
  }

  // Legacy format: top-level type/message
  const slashCmd = body.message?.slashCommand;
  const attachments = extractAttachments(body.message);
  return {
    type: body.type || "UNKNOWN",
    commandId: slashCmd?.commandId,
    message: body.message || {},
    user: body.user || body.message?.sender,
    space: body.space || body.message?.space,
    threadName: body.message?.thread?.name || body.message?.name,
    text: body.message?.text || "",
    argumentText: body.message?.argumentText || "",
    attachments,
  };
}

googleRoutes.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = parseGoogleEvent(req.body);

    console.log(`[Webhook] type=${event.type} cmd=${event.commandId} text="${event.text}" user=${event.user?.displayName} attachments=${event.attachments?.length || 0}`);
    // Log full payload once to see attachment structure
    if (event.attachments?.length || req.body.chat?.appCommandPayload?.message?.attachment) {
      console.log(`[Webhook] Full message payload:`, JSON.stringify(req.body.chat?.appCommandPayload?.message || req.body.message, null, 2));
    }

    // Handle ADDED_TO_SPACE
    if (event.type === "ADDED_TO_SPACE") {
      res.json(chatResponse(req.body, "Thanks for adding me! Use /bugfix in any thread to create a Linear ticket."));
      return;
    }

    // Handle slash command
    if (event.type === "SLASH_COMMAND" || event.commandId || event.text === "/bugfix") {
      await handleBugfixCommand(req.body, event, res);
      return;
    }

    // Handle regular MESSAGE
    if (event.type === "MESSAGE") {
      res.json(chatResponse(req.body, "Use the /bugfix command in a thread to create a bug ticket."));
      return;
    }

    res.json(chatResponse(req.body, ""));
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json(chatResponse(req.body, "Sorry, something went wrong processing your request."));
  }
});

async function handleBugfixCommand(rawBody: any, event: ReturnType<typeof parseGoogleEvent>, res: Response) {
  const threadId = event.threadName || "unknown";
  const userName = event.user?.displayName || "Unknown";

  // Check if user provided a bug description after /bugfix
  const bugDescription = (event.argumentText || "").trim();
  if (!bugDescription) {
    res.json(chatResponse(rawBody,
      "⚠️ Please describe the bug after the command.\n\n" +
      "*Usage:* `/bugfix <description>`\n\n" +
      "*Example:* `/bugfix Login page crashes when clicking submit button. Error shows 500 in console.`\n\n" +
      "The more detail you provide, the better the ticket will be!"
    ));
    return;
  }

  try {
    // Process synchronously so we can include the ticket link in the response
    const result = await processAndCreateTicket(event, threadId, userName);
    res.json(chatResponse(rawBody, result));
  } catch (error: any) {
    console.error("[Error] Failed to create ticket:", error.message);
    res.json(chatResponse(rawBody, `❌ Failed to create bug ticket: ${error.message}`));
  }
}

async function processAndCreateTicket(
  event: ReturnType<typeof parseGoogleEvent>,
  threadId: string,
  userName: string,
): Promise<string> {
  // Log the webhook receipt
  await IntegrationLog.create({
    action: "webhook_received",
    status: "success",
    threadId,
    metadata: { user: userName, space: event.space?.displayName },
  }).catch(() => {});

  // Extract thread context
  const messages: string[] = [];

  if (event.argumentText) {
    messages.push(event.argumentText);
  }

  if (event.text && event.text !== "/bugfix") {
    messages.push(event.text);
  }

  if (event.message?.thread?.messages) {
    for (const msg of event.message.thread.messages) {
      const sender = msg.sender?.displayName || "Unknown";
      const text = msg.text || msg.argumentText || "";
      messages.push(`${sender}: ${text}`);
    }
  }

  if (messages.length === 0) {
    messages.push(`Bug reported by ${userName} via /bugfix command in ${event.space?.displayName || "Google Chat"}.`);
  }

  // Step 1: Download attachments from Google Chat (for both AI analysis and Linear upload)
  const downloadedImages: { buffer: Buffer; filename: string; contentType: string }[] = [];
  const imageAttachments: ImageAttachment[] = [];

  if (event.attachments && event.attachments.length > 0) {
    console.log(`[Attachments] Downloading ${event.attachments.length} attachment(s) from Google Chat...`);
    for (const att of event.attachments) {
      try {
        const sourceUrl = att.downloadUri || att.thumbnailUri;
        if (!sourceUrl) continue;

        const response = await axios.get(sourceUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        const filename = att.contentName || att.name || `attachment-${Date.now()}.png`;
        const contentType = att.contentType || "image/png";

        console.log(`[Attachments] Downloaded ${filename} (${buffer.length} bytes)`);
        downloadedImages.push({ buffer, filename, contentType });

        // Save to temp file for Claude CLI to analyze
        if (contentType.startsWith("image/")) {
          const ext = contentType.split("/")[1] || "png";
          const tmpPath = join(tmpdir(), `bugfix-img-${Date.now()}.${ext}`);
          writeFileSync(tmpPath, buffer);
          imageAttachments.push({ filePath: tmpPath, filename });
        }
      } catch (err: any) {
        console.error(`[Attachments] Failed to download: ${err.message}`);
      }
    }
  }

  // Step 2: Analyze with Claude CLI (including images)
  console.log(`[AI] Analyzing thread ${threadId} with ${messages.length} message(s) and ${imageAttachments.length} image(s)...`);
  const bugReport = await analyzeThread(messages, imageAttachments);
  console.log(`[AI] Generated report: "${bugReport.title}"`);

  await IntegrationLog.create({
    action: "ai_processed",
    status: "success",
    threadId,
    title: bugReport.title,
  }).catch(() => {});

  // Step 3: Upload attachments to Linear
  let attachmentSection = "";
  if (downloadedImages.length > 0) {
    console.log(`[Attachments] Uploading ${downloadedImages.length} file(s) to Linear...`);
    const uploadedUrls: string[] = [];
    for (const img of downloadedImages) {
      try {
        const linearUrl = await uploadFileToLinear(img.filename, img.contentType, img.buffer);
        console.log(`[Attachments] Uploaded to Linear: ${linearUrl}`);

        if (img.contentType.startsWith("image/")) {
          uploadedUrls.push(`![${img.filename}](${linearUrl})`);
        } else {
          uploadedUrls.push(`[${img.filename}](${linearUrl})`);
        }
      } catch (err: any) {
        console.error(`[Attachments] Failed to upload to Linear: ${err.message}`);
      }
    }
    if (uploadedUrls.length > 0) {
      attachmentSection = `\n\n### Attachments\n${uploadedUrls.join("\n")}`;
    }
  }

  const description = `## Bug Report

**Description:** ${bugReport.description}

### Reproduction Steps
${bugReport.reproductionSteps}

### Expected Result
${bugReport.expectedResult}

### Actual Result
${bugReport.actualResult}

### Severity
${bugReport.severity}${attachmentSection}

---
_Auto-generated from Google Chat thread via /bugfix command by ${userName}_`;

  const issue = await createIssue({
    title: bugReport.title,
    description,
    priority: severityToPriority(bugReport.severity),
  });

  console.log(`[Linear] Created issue ${issue.identifier}: ${issue.url}`);

  // Log success
  await IntegrationLog.create({
    action: "ticket_created",
    status: "success",
    threadId,
    linearIssueId: issue.id,
    linearIssueUrl: issue.url,
    title: issue.title,
  }).catch(() => {});

  return `✅ Bug ticket created!\n\n*${issue.identifier}*: ${issue.title}\n🔗 ${issue.url}`;
}

function severityToPriority(severity: string): number {
  switch (severity) {
    case "critical": return 1;
    case "high": return 2;
    case "medium": return 3;
    case "low": return 4;
    default: return 0;
  }
}
