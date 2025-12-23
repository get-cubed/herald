#!/usr/bin/env node
import { loadConfig } from "../lib/config.js";
const config = await loadConfig();
console.log("Herald configuration:");
console.log(`  enabled: ${config.enabled}`);
console.log(`  style: ${config.style}`);
console.log(`  tts_provider: ${config.tts.provider}`);
console.log(`  max_words: ${config.preferences.max_words}`);
console.log(`  activate_editor: ${config.preferences.activate_editor}`);
if (config.preferences.summary_prompt) {
    console.log(`  summary: "${config.preferences.summary_prompt}"`);
}
else {
    console.log("  summary: (default TTS prompt)");
}
