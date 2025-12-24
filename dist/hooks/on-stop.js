#!/usr/bin/env node
import { loadConfig } from "../lib/config.js";
import { playAlert, playSound, activateEditor } from "../lib/audio.js";
import { withMediaControl } from "../lib/media.js";
import { cleanForSpeech, countWords, truncateToWords, summarizeWithClaude, } from "../lib/summarize.js";
import { waitForPlayerLock, releasePlayerLock } from "../lib/lock.js";
import { checkAndRecord, hashContent } from "../lib/recent.js";
import { extractLastAssistantMessage } from "../lib/transcript.js";
import { readStdin } from "../lib/stdin.js";
import { getProvider } from "../tts/index.js";
import { handleStop } from "../lib/stop-handler.js";
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
    // Delegate to handler with dependencies
    const result = await handleStop(input, config, {
        extractLastAssistantMessage,
        cleanForSpeech,
        countWords,
        truncateToWords,
        summarizeWithClaude,
        checkAndRecord,
        hashContent,
        waitForPlayerLock,
        releasePlayerLock,
        playSound,
        playAlert,
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
