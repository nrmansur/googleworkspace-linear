import { Router, Request, Response } from "express";
import { IntegrationLog } from "../models/IntegrationLog";

export const statsRoutes = Router();

// Get aggregated statistics
statsRoutes.get("/", async (_req: Request, res: Response) => {
  try {
    const [totalCreated, totalFailed, totalWebhooks, recentLogs] =
      await Promise.all([
        IntegrationLog.countDocuments({
          action: "ticket_created",
          status: "success",
        }),
        IntegrationLog.countDocuments({
          action: "ticket_failed",
          status: "failure",
        }),
        IntegrationLog.countDocuments({ action: "webhook_received" }),
        IntegrationLog.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
      ]);

    const successRate =
      totalCreated + totalFailed > 0
        ? ((totalCreated / (totalCreated + totalFailed)) * 100).toFixed(1)
        : "N/A";

    res.json({
      ticketsCreated: totalCreated,
      ticketsFailed: totalFailed,
      webhooksReceived: totalWebhooks,
      successRate,
      recentLogs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs with pagination
statsRoutes.get("/logs", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      IntegrationLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IntegrationLog.countDocuments(),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
