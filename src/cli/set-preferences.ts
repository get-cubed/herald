#!/usr/bin/env node
import { loadConfig, saveConfig } from "../lib/config.js";

const args = process.argv.slice(2).join(" ").trim();

if (!args || args === "show") {
  const config = await loadConfig();
  console.log("Herald TTS preferences:");
  console.log(`  max_words: ${config.preferences.max_words}`);
  console.log(`  activate_editor: ${config.preferences.activate_editor}`);
  if (config.preferences.summary_prompt) {
    console.log(`  summary: "${config.preferences.summary_prompt}"`);
  } else {
    console.log("  summary: (none - uses default TTS prompt)");
  }
  process.exit(0);
}

if (args.startsWith("max_words ")) {
  const num = parseInt(args.split(" ")[1], 10);
  if (isNaN(num) || num < 1) {
    console.error("Error: max_words requires a positive number");
    process.exit(1);
  }
  const config = await loadConfig();
  await saveConfig({
    preferences: { ...config.preferences, max_words: num },
  });
  console.log(`Max words set to: ${num}`);
  process.exit(0);
}

if (args.startsWith("summary ")) {
  let prompt = args.slice(8).trim();
  // Remove surrounding quotes if present
  if (
    (prompt.startsWith('"') && prompt.endsWith('"')) ||
    (prompt.startsWith("'") && prompt.endsWith("'"))
  ) {
    prompt = prompt.slice(1, -1);
  }
  const config = await loadConfig();
  await saveConfig({
    preferences: { ...config.preferences, summary_prompt: prompt },
  });
  console.log(`Summary prompt set to: "${prompt}"`);
  process.exit(0);
}

if (args === "summary clear" || args === "clear summary") {
  const config = await loadConfig();
  await saveConfig({
    preferences: { ...config.preferences, summary_prompt: null },
  });
  console.log("Summary prompt cleared (using default)");
  process.exit(0);
}

if (args === "activate_editor on" || args === "activate_editor true") {
  const config = await loadConfig();
  await saveConfig({
    preferences: { ...config.preferences, activate_editor: true },
  });
  console.log("Editor activation enabled");
  process.exit(0);
}

if (args === "activate_editor off" || args === "activate_editor false") {
  const config = await loadConfig();
  await saveConfig({
    preferences: { ...config.preferences, activate_editor: false },
  });
  console.log("Editor activation disabled");
  process.exit(0);
}

console.error("Unknown option. Use: show, max_words <number>, summary <prompt>, summary clear, activate_editor on/off");
process.exit(1);
