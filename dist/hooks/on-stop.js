#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playAlert, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { cleanForSpeech, countWords, truncateToWords, summarizeWithClaude, } from "../lib/summarize.js";
import { waitForPlayerLock, releasePlayerLock } from "../lib/lock.js";
import { checkAndRecord, hashContent } from "../lib/recent.js";
import { extractLastAssistantMessage } from "../lib/transcript.js";
import { getProvider } from "../tts/index.js";
// Minimum delay between alert sounds
const ALERT_MIN_DELAY_MS = 1000;
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
    // Read hook input from stdin
    const stdinText = await readStdin();
    let input = {};
    try {
        input = JSON.parse(stdinText);
    }
    catch {
        // No input or invalid JSON
    }
    const projectName = input.cwd ? basename(input.cwd) : undefined;
    // Prepare the message based on config style
    let messageContent;
    let isAlert = false;
    if (config.style === "alerts") {
        isAlert = true;
        // For alerts, use session_id for deduplication (each session gets one alert)
        messageContent = `alert:${input.session_id || projectName || "default"}`;
    }
    else {
        // TTS: Get the text to speak
        const transcriptPath = input.transcript_path;
        if (!transcriptPath) {
            messageContent = "Done";
        }
        else {
            const rawText = await extractLastAssistantMessage(transcriptPath);
            const wordCount = countWords(rawText);
            const maxWords = config.preferences.max_words;
            if (wordCount <= maxWords) {
                messageContent = cleanForSpeech(rawText);
            }
            else {
                // Try to summarize with Claude
                const summarized = await summarizeWithClaude(rawText, maxWords, config.preferences.summary_prompt);
                if (summarized) {
                    messageContent = summarized;
                }
                else {
                    // Fallback to truncation
                    messageContent = truncateToWords(cleanForSpeech(rawText), maxWords);
                }
            }
        }
        messageContent = messageContent || "Done";
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
        if (isAlert) {
            if (config.preferences.activate_editor) {
                playAlert(projectName);
            }
            else {
                playSound("alert");
            }
            // Minimum delay between alerts
            await new Promise((resolve) => setTimeout(resolve, ALERT_MIN_DELAY_MS));
        }
        else {
            const ttsProvider = getProvider(config.tts);
            if (config.preferences.activate_editor) {
                activateEditor(projectName);
            }
            await withMediaControl(() => ttsProvider.speak(messageContent));
        }
    }
    finally {
        await releasePlayerLock();
    }
}
main().catch(console.error);
