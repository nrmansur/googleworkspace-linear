import { Router, Request, Response } from "express";
import { analyzeThread } from "../services/claudeService";
import { createIssue } from "../services/linearService";
import { replyToThread } from "../services/googleChatService";
import { IntegrationLog } from "../models/IntegrationLog";

export const googleRoutes = Router();

/**
 * Google Chat sends events here when users interact with the bot.
 * Handles the /bugfix slash command.
 */
googleRoutes.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    // Google Chat sends different event types
    const eventType = event.type;

    // Handle ADDED_TO_SPACE
    if (eventType === "ADDED_TO_SPACE") {
      res.json({ text: "Thanks for adding me! Use /bugfix in any thread to create a Linear ticket." });
      return;
    }

    // Handle slash command
    if (eventType === "MESSAGE") {
      const slashCommand = event.message?.slashCommand;

      if (slashCommand?.commandId === "1" || event.message?.argumentText?.trim() === "/bugfix") {
        await handleBugfixCommand(event, res);
        return;
      }

      // Regular message - acknowledge
      res.json({ text: "Use the /bugfix command in a thread to create a bug ticket." });
      return;
    }

    res.json({ text: "" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json({ text: "Sorry, something went wrong processing your request." });
  }
});

async function handleBugfixCommand(event: any, res: Response) {
  const threadId = event.message?.thread?.name || event.message?.name || "unknown";
  const spaceId = event.space?.name?.replace("spaces/", "") || "";
  const threadKey = event.message?.thread?.threadKey || "";

  // Log the webhook receipt
  await IntegrationLog.create({
    action: "webhook_received",
    status: "success",
    threadId,
    metadata: { spaceId, user: event.user?.displayName },
  });

  // Extract messages from the thread context
  // Google Chat provides thread messages in the event for slash commands
  const messages: string[] = [];

  if (event.message?.argumentText) {
    messages.push(event.message.argumentText);
  }

  // The thread annotation contains prior messages
  if (event.message?.thread?.messages) {
    for (const msg of event.message.thread.messages) {
      const sender = msg.sender?.displayName || "Unknown";
      const text = msg.text || msg.argumentText || "";
      messages.push(`${sender}: ${text}`);
    }
  }

  // If we only have the slash command itself, use the annotation text
  if (messages.length === 0 && event.message?.text) {
    messages.push(event.message.text);
  }

  // Fallback message if thread is empty
  if (messages.length === 0) {
    messages.push("Bug reported via /bugfix command - no additional context provided.");
  }

  try {
    // Step 1: Analyze with Claude CLI
    const bugReport = await analyzeThread(messages);

    await IntegrationLog.create({
      action: "ai_processed",
      status: "success",
      threadId,
      title: bugReport.title,
    });

    // Step 2: Create Linear ticket
    const description = `## Bug Report

**Description:** ${bugReport.description}

### Reproduction Steps
${bugReport.reproductionSteps}

### Expected Result
${bugReport.expectedResult}

### Actual Result
${bugReport.actualResult}

### Severity
${bugReport.severity}

---
_Auto-generated from Google Chat thread via /bugfix command_`;

    const issue = await createIssue({
      title: bugReport.title,
      description,
      priority: severityToPriority(bugReport.severity),
    });

    // Log success
    await IntegrationLog.create({
      action: "ticket_created",
      status: "success",
      threadId,
      linearIssueId: issue.id,
      linearIssueUrl: issue.url,
      title: issue.title,
    });

    // Step 3: Reply to Google Chat thread
    const replyText = `✅ Bug ticket created!\n\n**${issue.identifier}**: ${issue.title}\n🔗 ${issue.url}`;

    try {
      await replyToThread(spaceId, threadKey, replyText);
    } catch {
      // Reply failure is non-critical
      console.warn("Failed to reply to Google Chat thread");
    }

    // Respond to the slash command
    res.json({ text: replyText });
  } catch (error: any) {
    await IntegrationLog.create({
      action: "ticket_failed",
      status: "failure",
      threadId,
      errorMessage: error.message,
    });

    res.json({
      text: `❌ Failed to create bug ticket: ${error.message}. Please check the admin dashboard for details.`,
    });
  }
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
