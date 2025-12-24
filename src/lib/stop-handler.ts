import { basename } from "path";
import type { HeraldConfig, StopHookInput } from "../types.js";
import type { ITTSProvider } from "../tts/provider.js";

// Minimum delay between alert sounds
const ALERT_MIN_DELAY_MS = 1000;

/**
 * Result of handling a stop event.
 */
export interface StopResult {
  handled: boolean;
  reason?: "disabled" | "duplicate" | "no_lock" | "played";
}

/**
 * Dependencies for the stop handler.
 * Injecting these allows for easy testing.
 */
export interface StopDeps {
  extractLastAssistantMessage: (path: string) => Promise<string>;
  cleanForSpeech: (text: string) => string;
  countWords: (text: string) => number;
  truncateToWords: (text: string, max: number) => string;
  summarizeWithClaude: (
    text: string,
    maxWords: number,
    prompt: string | null
  ) => Promise<string | null>;
  checkAndRecord: (hash: string) => Promise<boolean>;
  hashContent: (content: string) => string;
  waitForPlayerLock: () => Promise<boolean>;
  releasePlayerLock: () => Promise<void>;
  playSound: (type: "alert" | "ping") => void;
  playAlert: (projectName?: string) => void;
  getProvider: (config: HeraldConfig["tts"]) => ITTSProvider;
  withMediaControl: <T>(fn: () => Promise<T>) => Promise<T>;
  activateEditor: (projectName?: string) => void;
}

/**
 * Generate the message content for a stop event.
 */
export async function getStopMessage(
  input: StopHookInput,
  config: HeraldConfig,
  deps: Pick<
    StopDeps,
    | "extractLastAssistantMessage"
    | "cleanForSpeech"
    | "countWords"
    | "truncateToWords"
    | "summarizeWithClaude"
  >
): Promise<{ content: string; isAlert: boolean }> {
  const projectName = input.cwd ? basename(input.cwd) : undefined;

  if (config.style === "alerts") {
    // For alerts, use session_id for deduplication (each session gets one alert)
    const content = `alert:${input.session_id || projectName || "default"}`;
    return { content, isAlert: true };
  }

  // TTS: Get the text to speak
  const transcriptPath = input.transcript_path;

  if (!transcriptPath) {
    return { content: "Done", isAlert: false };
  }

  const rawText = await deps.extractLastAssistantMessage(transcriptPath);
  const wordCount = deps.countWords(rawText);
  const maxWords = config.preferences.max_words;

  let messageContent: string;

  if (wordCount <= maxWords) {
    messageContent = deps.cleanForSpeech(rawText);
  } else {
    // Try to summarize with Claude
    const summarized = await deps.summarizeWithClaude(
      rawText,
      maxWords,
      config.preferences.summary_prompt
    );

    if (summarized) {
      messageContent = summarized;
    } else {
      // Fallback to truncation
      messageContent = deps.truncateToWords(
        deps.cleanForSpeech(rawText),
        maxWords
      );
    }
  }

  return { content: messageContent || "Done", isAlert: false };
}

/**
 * Handle a stop event.
 * This is the main business logic extracted from the hook.
 */
export async function handleStop(
  input: StopHookInput,
  config: HeraldConfig,
  deps: StopDeps
): Promise<StopResult> {
  // Check if enabled
  if (!config.enabled) {
    return { handled: false, reason: "disabled" };
  }

  const projectName = input.cwd ? basename(input.cwd) : undefined;

  // Generate message content
  const { content: messageContent, isAlert } = await getStopMessage(
    input,
    config,
    deps
  );

  // Check for duplicate and record this play atomically
  const hash = deps.hashContent(messageContent);
  const isNew = await deps.checkAndRecord(hash);

  if (!isNew) {
    return { handled: false, reason: "duplicate" };
  }

  // Wait for player lock
  const gotLock = await deps.waitForPlayerLock();
  if (!gotLock) {
    return { handled: false, reason: "no_lock" };
  }

  // Play the notification
  try {
    if (isAlert) {
      if (config.preferences.activate_editor) {
        deps.playAlert(projectName);
      } else {
        deps.playSound("alert");
      }
      // Minimum delay between alerts
      await new Promise((resolve) => setTimeout(resolve, ALERT_MIN_DELAY_MS));
    } else {
      const ttsProvider = deps.getProvider(config.tts);
      if (config.preferences.activate_editor) {
        deps.activateEditor(projectName);
      }
      await deps.withMediaControl(() => ttsProvider.speak(messageContent));
    }
  } finally {
    await deps.releasePlayerLock();
  }

  return { handled: true, reason: "played" };
}
