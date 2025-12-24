#!/usr/bin/env node
import { loadConfig } from "../lib/config.js";
import { playPing, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { waitForPlayerLock, releasePlayerLock } from "../lib/lock.js";
import { checkAndRecord, hashContent } from "../lib/recent.js";
import { readStdin } from "../lib/stdin.js";
import { getProvider } from "../tts/index.js";
import { handleNotification } from "../lib/notification-handler.js";
import type { NotificationHookInput } from "../types.js";

async function main() {
  const config = await loadConfig();

  if (!config.enabled) {
    process.exit(0);
  }

  const stdinText = await readStdin();
  let input: NotificationHookInput = { notification_type: "" };

  try {
    input = JSON.parse(stdinText) as NotificationHookInput;
  } catch {
    process.exit(0);
  }

  // Delegate to handler with dependencies
  const result = await handleNotification(input, config, {
    checkAndRecord,
    hashContent,
    waitForPlayerLock,
    releasePlayerLock,
    playSound,
    playPing,
    getProvider,
    withMediaControl,
    activateEditor,
  });

  // Exit based on result
  if (!result.handled) {
    process.exit(0);
  }
}

main().catch(console.error);
