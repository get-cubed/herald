#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playPing, playSound, activateEditor } from "../lib/audio.js";
import { getProvider } from "../tts/index.js";
import type { NotificationHookInput } from "../types.js";

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
  let input: NotificationHookInput = { notification_type: "" };

  try {
    input = JSON.parse(stdinText);
  } catch {
    process.exit(0);
  }

  // Only handle specific notification types
  const notificationType = input.notification_type;
  const validTypes = ["permission_prompt", "idle_prompt", "elicitation_dialog"];

  if (!validTypes.includes(notificationType)) {
    process.exit(0);
  }

  switch (config.style) {
    case "tts": {
      const ttsProvider = getProvider(config.tts);
      let message: string;
      switch (notificationType) {
        case "permission_prompt":
          message = "Claude needs permission";
          break;
        case "elicitation_dialog":
          message = "Claude needs more information";
          break;
        default:
          message = "Claude is waiting for input";
      }
      await ttsProvider.speak(message);
      if (config.preferences.activate_editor) {
        const projectName = input.cwd ? basename(input.cwd) : undefined;
        activateEditor(projectName);
      }
      break;
    }

    case "alerts": {
      const projectName = input.cwd ? basename(input.cwd) : undefined;
      if (config.preferences.activate_editor) {
        playPing(projectName);
      } else {
        playSound("ping");
      }
      break;
    }
  }
}

main().catch(console.error);
