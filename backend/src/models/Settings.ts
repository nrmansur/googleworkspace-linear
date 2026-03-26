import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  key: string;
  value: string;
  encrypted: boolean;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    encrypted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>("Settings", SettingsSchema);
