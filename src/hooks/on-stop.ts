#!/usr/bin/env node
import { readFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { loadConfig } from "../lib/config.js";
import { playAlert, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import {
  cleanForSpeech,
  countWords,
  truncateToWords,
  summarizeWithClaude,
} from "../lib/summarize.js";
import { getProvider } from "../tts/index.js";
import type { StopHookInput, TranscriptMessage } from "../types.js";

// Global lock to prevent multiple plays (regardless of session ID)
const LOCK_FILE = join(homedir(), ".config", "herald", "tts.lock");
const TTS_LOCK_EXPIRY_MS = 30000; // 30 seconds - covers API latency + audio playback
const ALERT_LOCK_EXPIRY_MS = 2000; // 2 seconds - just enough for the sound to play

async function acquireGlobalLock(expiryMs: number): Promise<boolean> {
  try {
    await mkdir(join(homedir(), ".config", "herald"), { recursive: true });

    // Check if lock exists and is stale (expired)
    if (existsSync(LOCK_FILE)) {
      try {
        const content = await readFile(LOCK_FILE, "utf-8");
        const timestamp = parseInt(content, 10);
        if (Date.now() - timestamp < expiryMs) {
          return false; // Lock is held and not expired
        }
        // Lock is stale, remove it
        await unlink(LOCK_FILE);
      } catch {
        // Ignore errors reading stale lock
      }
    }

    // Atomic lock acquisition using exclusive create (wx flag)
    // This fails if file already exists, preventing race conditions
    const handle = await open(LOCK_FILE, "wx");
    await handle.write(String(Date.now()));
    await handle.close();
    return true;
  } catch (err) {
    // EEXIST means another process created the lock between our check and create
    if (err && typeof err === "object" && "code" in err && err.code === "EEXIST") {
      return false;
    }
    return true; // Other errors, fail open
  }
}

async function extractLastAssistantMessage(
  transcriptPath: string
): Promise<string> {
  try {
    const text = await readFile(transcriptPath, "utf-8");
    const lines = text.trim().split("\n");

    // Parse JSONL and find last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      const msg: TranscriptMessage = JSON.parse(lines[i]);
      if (msg.type === "assistant" && msg.message?.content) {
        const textParts = msg.message.content
          .filter((block) => block.type === "text" && block.text)
          .map((block) => block.text!)
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

async function readStdin(timeoutMs: number = 5000): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    let resolved = false;

    const done = (result: string) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // Timeout to prevent hanging if stdin never closes
    const timeout = setTimeout(() => {
      done(data);
    }, timeoutMs);

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      done(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timeout);
      done(data);
    });

    // Handle case where stdin is empty/closed
    if (process.stdin.isTTY) {
      clearTimeout(timeout);
      done("");
    }
  });
}

async function main() {
  const config = await loadConfig();

  if (!config.enabled) {
    process.exit(0);
  }

  // Read hook input from stdin
  const stdinText = await readStdin();

  let input: StopHookInput = {};

  try {
    input = JSON.parse(stdinText);
  } catch {
    // No input or invalid JSON
  }

  // Prevent duplicate plays (global lock, not per-session)
  // Use shorter lock for alerts since they play quickly
  const lockExpiry = config.style === "alerts" ? ALERT_LOCK_EXPIRY_MS : TTS_LOCK_EXPIRY_MS;
  const gotLock = await acquireGlobalLock(lockExpiry);
  if (!gotLock) {
    process.exit(0);
  }
  switch (config.style) {
    case "tts": {
      const ttsProvider = getProvider(config.tts);
      const transcriptPath = input.transcript_path;

      if (!transcriptPath) {
        if (config.preferences.activate_editor) {
          const projectName = input.cwd ? basename(input.cwd) : undefined;
          activateEditor(projectName);
        }
        await withMediaControl(() => ttsProvider.speak("Done"));
        break;
      }

      const rawText = await extractLastAssistantMessage(transcriptPath);
      const wordCount = countWords(rawText);
      const maxWords = config.preferences.max_words;

      let finalText: string;

      if (wordCount <= maxWords) {
        // Short enough, just clean it
        finalText = cleanForSpeech(rawText);
      } else {
        // Try to summarize with Claude
        const summarized = await summarizeWithClaude(
          rawText,
          maxWords,
          config.preferences.summary_prompt
        );

        if (summarized) {
          finalText = summarized;
        } else {
          // Fallback to truncation
          finalText = truncateToWords(cleanForSpeech(rawText), maxWords);
        }
      }

      const textToSpeak = finalText || "Done";
      if (config.preferences.activate_editor) {
        const projectName = input.cwd ? basename(input.cwd) : undefined;
        activateEditor(projectName);
      }
      await withMediaControl(() => ttsProvider.speak(textToSpeak));
      break;
    }

    case "alerts": {
      const projectName = input.cwd ? basename(input.cwd) : undefined;
      if (config.preferences.activate_editor) {
        playAlert(projectName);
      } else {
        playSound("alert");
      }
      break;
    }

    default:
      // Unknown style, do nothing
      break;
  }
}

main().catch(console.error);
