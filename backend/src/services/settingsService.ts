import { Settings } from "../models/Settings";
import { encrypt, decrypt } from "../utils/encryption";

const SENSITIVE_KEYS = ["linear_api_key", "google_webhook_secret", "encryption_key"];

export async function getSetting(key: string): Promise<string | null> {
  const setting = await Settings.findOne({ key });
  if (!setting) return null;
  return setting.encrypted ? decrypt(setting.value) : setting.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const isSensitive = SENSITIVE_KEYS.includes(key);
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
  const result = await Settings.deleteOne({ key });
  return result.deletedCount > 0;
}
