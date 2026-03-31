import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getSetting } from "./settingsService";

const execAsync = promisify(exec);

interface BugReport {
  title: string;
  description: string;
  reproductionSteps: string;
  expectedResult: string;
  actualResult: string;
  severity: string;
}

export interface ImageAttachment {
  filePath: string;
  filename: string;
}

export async function analyzeThread(messages: string[], images: ImageAttachment[] = []): Promise<BugReport> {
  const conversationText = messages.join("\n---\n");
  const modelParam = (await getSetting("ai_model")) || "sonnet";

  // If images are provided, include them as base64 in the prompt
  let imageInstructions = "";
  if (images.length > 0) {
    imageInstructions = `\n\nThe user attached ${images.length} screenshot(s). I will read them now to analyze the visual context.\n`;
    for (const img of images) {
      imageInstructions += `\nPlease read and analyze this image file: ${img.filePath}\n`;
    }
    imageInstructions += `\nCarefully analyze the screenshot(s) — look for error messages, UI issues, broken layouts, console errors, etc. Use what you see in the image(s) to write a more detailed and accurate bug report.`;
  }

  const prompt = `You are a QA engineer. Analyze this Google Chat thread and create a structured bug report.

Thread content:
${conversationText}${imageInstructions}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"title":"Brief bug title","description":"Detailed description of the bug including what you observe in any attached screenshots","reproductionSteps":"1. Step one\\n2. Step two","expectedResult":"What should happen","actualResult":"What actually happens (describe what the screenshot shows if applicable)","severity":"critical|high|medium|low"}`;

  try {
    // Write prompt to a temp file to avoid shell escaping issues
    const tmpFile = join(tmpdir(), `bugfix-prompt-${Date.now()}.txt`);
    writeFileSync(tmpFile, prompt, "utf-8");

    // Claude CLI in -p mode with --allowedTools Read + --add-dir for temp directory so it can read image files
    const addDirFlag = images.length > 0 ? `--allowedTools "Read" --add-dir "${tmpdir()}"` : "";
    const cmd = `cat "${tmpFile}" | claude --model ${modelParam} --output-format json ${addDirFlag} -p`;

    console.log(`[AI] Running Claude CLI: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd, { timeout: 180000, maxBuffer: 5 * 1024 * 1024 });
    if (stderr) console.error(`[AI] Claude CLI stderr: ${stderr}`);

    // Clean up temp file
    try { unlinkSync(tmpFile); } catch {}
    // Clean up image files
    for (const img of images) {
      try { unlinkSync(img.filePath); } catch {}
    }

    // Claude CLI --output-format json wraps the response in an envelope
    const envelope = JSON.parse(stdout.trim());
    const resultText = envelope.result || stdout.trim();

    // Parse the AI's JSON response
    const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.title || parsed.title === "undefined") {
      throw new Error("AI returned invalid title");
    }

    return parsed as BugReport;
  } catch (error: any) {
    console.error("Claude CLI error, using fallback:", error.message);
    for (const img of images) {
      try { unlinkSync(img.filePath); } catch {}
    }
    return {
      title: `Bug report from Google Chat`,
      description: conversationText.substring(0, 500),
      reproductionSteps: "See thread description for details.",
      expectedResult: "To be determined from thread context.",
      actualResult: "To be determined from thread context.",
      severity: "medium",
    };
  }
}
