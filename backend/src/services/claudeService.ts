import { exec } from "child_process";
import { promisify } from "util";
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

export async function analyzeThread(messages: string[]): Promise<BugReport> {
  const conversationText = messages.join("\n---\n");
  const modelParam = (await getSetting("ai_model")) || "sonnet";

  const prompt = `You are a QA engineer. Analyze this Google Chat thread and create a structured bug report.

Thread content:
${conversationText}

Respond ONLY with valid JSON in this exact format:
{
  "title": "Brief bug title",
  "description": "Detailed description of the bug",
  "reproductionSteps": "1. Step one\\n2. Step two\\n3. Step three",
  "expectedResult": "What should happen",
  "actualResult": "What actually happens",
  "severity": "critical|high|medium|low"
}`;

  try {
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const { stdout } = await execAsync(
      `echo '${escapedPrompt}' | claude --model ${modelParam} --output-format json -p`,
      { timeout: 60000, maxBuffer: 1024 * 1024 }
    );

    const parsed = JSON.parse(stdout.trim());
    return parsed as BugReport;
  } catch (error) {
    // Fallback: generate a basic report from the thread content
    console.error("Claude CLI error, using fallback:", error);
    return {
      title: `Bug report from chat thread`,
      description: conversationText.substring(0, 500),
      reproductionSteps: "See thread description for details.",
      expectedResult: "To be determined from thread context.",
      actualResult: "To be determined from thread context.",
      severity: "medium",
    };
  }
}
