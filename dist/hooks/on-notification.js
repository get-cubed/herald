#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playPing, activateEditor } from "../lib/audio.js";
import { getProvider } from "../tts/index.js";
async function readStdin() {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf-8");
        process.stdin.on("data", (chunk) => {
            data += chunk;
        });
        process.stdin.on("end", () => {
            resolve(data);
        });
        if (process.stdin.isTTY) {
            resolve("");
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
    let input = { type: "" };
    try {
        input = JSON.parse(stdinText);
    }
    catch {
        process.exit(0);
    }
    // Only handle specific notification types
    const notificationType = input.type;
    if (notificationType !== "permission_prompt" && notificationType !== "idle_prompt") {
        process.exit(0);
    }
    switch (config.style) {
        case "tts": {
            const ttsProvider = getProvider(config.tts);
            const message = notificationType === "permission_prompt"
                ? "Claude needs permission"
                : "Claude is waiting for input";
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
            }
            else {
                const { playSound } = await import("../lib/audio.js");
                playSound("ping");
            }
            break;
        }
    }
}
main().catch(console.error);
