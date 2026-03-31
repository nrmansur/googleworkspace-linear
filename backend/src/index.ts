import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { googleRoutes } from "./routes/google";
import { settingsRoutes } from "./routes/settings";
import { statsRoutes } from "./routes/stats";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(morgan("combined"));
app.use(express.json());

// Routes
app.use("/api/google", googleRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/gworkspace-linear";

// Disable Mongoose buffering so queries fail fast when MongoDB is unavailable
mongoose.set("bufferCommands", false);

// Start server immediately, connect to MongoDB in the background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.warn("MongoDB not available — running without database:", err.message);
  });

export default app;
