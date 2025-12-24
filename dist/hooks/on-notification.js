#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playPing, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { waitForPlayerLock, releasePlayerLock } from "../lib/lock.js";
import { checkAndRecord, hashContent } from "../lib/recent.js";
import { getProvider } from "../tts/index.js";
// Minimum delay between ping sounds
const PING_MIN_DELAY_MS = 1000;
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
    const projectName = input.cwd ? basename(input.cwd) : undefined;
    // Prepare the message based on config style
    let messageContent;
    let isPing = false;
    if (config.style === "alerts") {
        isPing = true;
        // For pings, use session_id for deduplication (each session gets one ping per type)
        messageContent = `ping:${notificationType}:${input.session_id || projectName || "default"}`;
    }
    else {
        // TTS mode
        switch (notificationType) {
            case "permission_prompt":
                messageContent = "Claude needs permission";
                break;
            case "elicitation_dialog":
                messageContent = "Claude needs more information";
                break;
            default:
                messageContent = "Claude is waiting for input";
        }
    }
    // Check for duplicate and record this play atomically
    const hash = hashContent(messageContent);
    const isNew = await checkAndRecord(hash);
    if (!isNew) {
        // Duplicate message, skip
        process.exit(0);
    }
    // Wait for player lock (blocks until available or timeout)
    const gotLock = await waitForPlayerLock();
    if (!gotLock) {
        // Timed out waiting for lock
        process.exit(0);
    }
    // Play the message
    try {
        if (isPing) {
            if (config.preferences.activate_editor) {
                playPing(projectName);
            }
            else {
                playSound("ping");
            }
            // Minimum delay between pings
            await new Promise((resolve) => setTimeout(resolve, PING_MIN_DELAY_MS));
        }
        else {
            const ttsProvider = getProvider(config.tts);
            await withMediaControl(() => ttsProvider.speak(messageContent));
            if (config.preferences.activate_editor) {
                activateEditor(projectName);
            }
        }
    }
    finally {
        await releasePlayerLock();
    }
}
main().catch(console.error);
