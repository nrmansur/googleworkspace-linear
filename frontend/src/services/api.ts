import axios from "axios";
import { SettingsMap, Stats, PaginatedLogs, LinearTeam } from "../types";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({ baseURL: API_BASE });

// Settings
export const getSettings = () =>
  api.get<SettingsMap>("/settings").then((r) => r.data);

export const updateSetting = (key: string, value: string) =>
  api.put(`/settings/${key}`, { value }).then((r) => r.data);

export const deleteSetting = (key: string) =>
  api.delete(`/settings/${key}`).then((r) => r.data);

// Stats
export const getStats = () =>
  api.get<Stats>("/stats").then((r) => r.data);

export const getLogs = (page = 1, limit = 20) =>
  api.get<PaginatedLogs>(`/stats/logs?page=${page}&limit=${limit}`).then((r) => r.data);

// Linear
export const getLinearTeams = () =>
  api.get<LinearTeam[]>("/settings/linear/teams").then((r) => r.data);
