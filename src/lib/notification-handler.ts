import { basename } from "path";
import type { HeraldConfig, NotificationHookInput } from "../types.js";
import type { ITTSProvider } from "../tts/provider.js";

// Minimum delay between ping sounds
const PING_MIN_DELAY_MS = 1000;

// Valid notification types that trigger notifications
const VALID_NOTIFICATION_TYPES = ["permission_prompt", "elicitation_dialog"];

/**
 * Result of handling a notification.
 */
export interface NotificationResult {
  handled: boolean;
  reason?: "disabled" | "invalid_type" | "duplicate" | "no_lock" | "played";
}

/**
 * Dependencies for the notification handler.
 * Injecting these allows for easy testing.
 */
export interface NotificationDeps {
  checkAndRecord: (hash: string) => Promise<boolean>;
  hashContent: (content: string) => string;
  waitForPlayerLock: () => Promise<boolean>;
  releasePlayerLock: () => Promise<void>;
  playSound: (type: "alert" | "ping") => void;
  playPing: (projectName?: string) => void;
  getProvider: (config: HeraldConfig["tts"]) => ITTSProvider;
  withMediaControl: <T>(fn: () => Promise<T>) => Promise<T>;
  activateEditor: (projectName?: string) => void;
}

/**
 * Generate the message content based on notification type and config style.
 */
export function getNotificationMessage(
  notificationType: string,
  sessionId: string | undefined,
  projectName: string | undefined,
  style: "tts" | "alerts"
): { content: string; isPing: boolean } {
  if (style === "alerts") {
    // For pings, use session_id for deduplication (each session gets one ping per type)
    const content = `ping:${notificationType}:${sessionId || projectName || "default"}`;
    return { content, isPing: true };
  }

  // TTS mode
  let content: string;
  switch (notificationType) {
    case "permission_prompt":
      content = "Claude needs permission";
      break;
    case "elicitation_dialog":
      content = "Claude needs more information";
      break;
    default:
      content = "Claude is waiting for input";
  }

  return { content, isPing: false };
}

/**
 * Handle a notification event.
 * This is the main business logic extracted from the hook.
 */
export async function handleNotification(
  input: NotificationHookInput,
  config: HeraldConfig,
  deps: NotificationDeps
): Promise<NotificationResult> {
  // Check if enabled
  if (!config.enabled) {
    return { handled: false, reason: "disabled" };
  }

  // Validate notification type
  const notificationType = input.notification_type;
  if (!VALID_NOTIFICATION_TYPES.includes(notificationType)) {
    return { handled: false, reason: "invalid_type" };
  }

  const projectName = input.cwd ? basename(input.cwd) : undefined;

  // Generate message content
  const { content: messageContent, isPing } = getNotificationMessage(
    notificationType,
    input.session_id,
    projectName,
    config.style
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
    if (isPing) {
      if (config.preferences.activate_editor) {
        deps.playPing(projectName);
      } else {
        deps.playSound("ping");
      }
      // Minimum delay between pings
      await new Promise((resolve) => setTimeout(resolve, PING_MIN_DELAY_MS));
    } else {
      const ttsProvider = deps.getProvider(config.tts);
      await deps.withMediaControl(() => ttsProvider.speak(messageContent));
      if (config.preferences.activate_editor) {
        deps.activateEditor(projectName);
      }
    }
  } finally {
    await deps.releasePlayerLock();
  }

  return { handled: true, reason: "played" };
}
