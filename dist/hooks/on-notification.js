#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playPing, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { getProvider } from "../tts/index.js";
async function readStdin(timeoutMs = 5000) {
    return new Promise((resolve) => {
        let data = "";
        let resolved = false;
        const done = (result) => {
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
    const stdinText = await readStdin();
    let input = { notification_type: "" };
    try {
        input = JSON.parse(stdinText);
    }
    catch {
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
            let message;
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
            await withMediaControl(() => ttsProvider.speak(message));
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
            }
            else {
                playSound("ping");
            }
            break;
        }
    }
}
main().catch(console.error);
