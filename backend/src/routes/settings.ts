import { Router, Request, Response } from "express";
import {
  getAllSettings,
  getSetting,
  setSetting,
  deleteSetting,
} from "../services/settingsService";
import { getTeams, getLabels } from "../services/linearService";

export const settingsRoutes = Router();

// Get all settings (sensitive values are masked)
settingsRoutes.get("/", async (_req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a setting
settingsRoutes.put("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value && value !== "") {
      res.status(400).json({ error: "Value is required" });
      return;
    }

    await setSetting(key, value);
    res.json({ success: true, key });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a setting
settingsRoutes.delete("/:key", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSetting(req.params.key);
    res.json({ success: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test Linear connection and fetch teams
settingsRoutes.get("/linear/teams", async (_req: Request, res: Response) => {
  try {
    const teams = await getTeams();
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch labels for a team
settingsRoutes.get(
  "/linear/teams/:teamId/labels",
  async (req: Request, res: Response) => {
    try {
      const labels = await getLabels(req.params.teamId);
      res.json(labels);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);
