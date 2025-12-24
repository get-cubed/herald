#!/usr/bin/env node
import { basename } from "path";
import { loadConfig } from "../lib/config.js";
import { playAlert, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { cleanForSpeech, countWords, truncateToWords, summarizeWithClaude, } from "../lib/summarize.js";
import { acquireGlobalLock, TTS_LOCK_EXPIRY_MS, ALERT_LOCK_EXPIRY_MS, } from "../lib/lock.js";
import { extractLastAssistantMessage } from "../lib/transcript.js";
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
    // Read hook input from stdin
    const stdinText = await readStdin();
    let input = {};
    try {
        input = JSON.parse(stdinText);
    }
    catch {
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
            let finalText;
            if (wordCount <= maxWords) {
                // Short enough, just clean it
                finalText = cleanForSpeech(rawText);
            }
            else {
                // Try to summarize with Claude
                const summarized = await summarizeWithClaude(rawText, maxWords, config.preferences.summary_prompt);
                if (summarized) {
                    finalText = summarized;
                }
                else {
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
            }
            else {
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
