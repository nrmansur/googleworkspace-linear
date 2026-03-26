import mongoose, { Schema, Document } from "mongoose";

export interface IIntegrationLog extends Document {
  action: "ticket_created" | "ticket_failed" | "webhook_received" | "ai_processed";
  status: "success" | "failure";
  threadId: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
  title?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const IntegrationLogSchema = new Schema<IIntegrationLog>(
  {
    action: {
      type: String,
      required: true,
      enum: ["ticket_created", "ticket_failed", "webhook_received", "ai_processed"],
    },
    status: { type: String, required: true, enum: ["success", "failure"] },
    threadId: { type: String, required: true },
    linearIssueId: { type: String },
    linearIssueUrl: { type: String },
    title: { type: String },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

IntegrationLogSchema.index({ createdAt: -1 });
IntegrationLogSchema.index({ action: 1, status: 1 });

export const IntegrationLog = mongoose.model<IIntegrationLog>(
  "IntegrationLog",
  IntegrationLogSchema
);
