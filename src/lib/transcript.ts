import { readFile } from "fs/promises";
import type { TranscriptMessage } from "../types.js";

/**
 * Parse JSONL transcript and extract text from the last assistant message.
 * @param transcriptPath - Path to the JSONL transcript file
 * @returns The text content of the last assistant message, or "Done" if not found
 */
export async function extractLastAssistantMessage(
  transcriptPath: string
): Promise<string> {
  try {
    const text = await readFile(transcriptPath, "utf-8");
    return extractLastAssistantMessageFromText(text);
  } catch {
    return "Done";
  }
}

/**
 * Parse JSONL text and extract text from the last assistant message.
 * Pure function for easier testing.
 * @param text - JSONL transcript content
 * @returns The text content of the last assistant message, or "Done" if not found
 */
export function extractLastAssistantMessageFromText(text: string): string {
  try {
    const lines = text.trim().split("\n");

    // Parse JSONL and find last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      const msg: TranscriptMessage = JSON.parse(lines[i]) as TranscriptMessage;
      if (msg.type === "assistant" && msg.message?.content) {
        const textParts = msg.message.content
          .filter((block) => block.type === "text" && block.text)
          .map((block) => block.text ?? "")
          .join(" ");

        if (textParts.trim()) {
          return textParts.trim();
        }
      }
    }
  } catch {
    // Fall through
  }
  return "Done";
}
