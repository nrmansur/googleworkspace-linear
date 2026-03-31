import { Settings } from "../models/Settings";
import { encrypt, decrypt } from "../utils/encryption";
import mongoose from "mongoose";

const SENSITIVE_KEYS = ["linear_api_key", "google_webhook_secret", "encryption_key"];

// In-memory fallback when MongoDB is unavailable
const memoryStore = new Map<string, { value: string; encrypted: boolean }>();

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function getSetting(key: string): Promise<string | null> {
  if (!isDbConnected()) {
    const entry = memoryStore.get(key);
    return entry ? entry.value : null;
  }
  const setting = await Settings.findOne({ key });
  if (!setting) return null;
  return setting.encrypted ? decrypt(setting.value) : setting.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const isSensitive = SENSITIVE_KEYS.includes(key);

  if (!isDbConnected()) {
    // Store plaintext in memory (no encryption needed for runtime-only store)
    memoryStore.set(key, { value, encrypted: isSensitive });
    return;
  }

  const storedValue = isSensitive ? encrypt(value) : value;

  await Settings.findOneAndUpdate(
    { key },
    { key, value: storedValue, encrypted: isSensitive },
    { upsert: true, new: true }
  );
}

export async function getAllSettings(): Promise<
  Record<string, { value: string; encrypted: boolean }>
> {
  if (!isDbConnected()) {
    const result: Record<string, { value: string; encrypted: boolean }> = {};
    for (const [k, v] of memoryStore) {
      result[k] = {
        value: v.encrypted ? "••••••••" : v.value,
        encrypted: v.encrypted,
      };
    }
    return result;
  }

  const settings = await Settings.find();
  const result: Record<string, { value: string; encrypted: boolean }> = {};

  for (const s of settings) {
    result[s.key] = {
      value: s.encrypted ? "••••••••" : s.value,
      encrypted: s.encrypted,
    };
  }
  return result;
}

export async function deleteSetting(key: string): Promise<boolean> {
  if (!isDbConnected()) {
    return memoryStore.delete(key);
  }
  const result = await Settings.deleteOne({ key });
  return result.deletedCount > 0;
}
