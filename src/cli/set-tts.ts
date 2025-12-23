#!/usr/bin/env node
import { loadConfig, saveConfig } from "../lib/config.js";
import type { TTSProvider } from "../types.js";

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

async function showStatus() {
  const config = await loadConfig();
  console.log("TTS provider configuration:");
  console.log(`  provider: ${config.tts.provider}`);
  if (config.tts.provider === "elevenlabs") {
    console.log(`  api_key: ${config.tts.elevenlabs?.apiKey ? "****" + config.tts.elevenlabs.apiKey.slice(-4) : "(not set)"}`);
    console.log(`  voice_id: ${config.tts.elevenlabs?.voiceId || "(not set)"}`);
  }
}

async function setProvider(provider: string) {
  const validProviders: TTSProvider[] = ["macos", "windows", "elevenlabs"];
  if (!validProviders.includes(provider as TTSProvider)) {
    console.error(`Error: Invalid provider. Choose from: ${validProviders.join(", ")}`);
    process.exit(1);
  }
  await saveConfig({ tts: { provider: provider as TTSProvider } });
  console.log(`TTS provider set to: ${provider}`);
}

async function setElevenLabsConfig(key: string, value: string) {
  const config = await loadConfig();

  if (key === "api_key") {
    await saveConfig({
      tts: {
        ...config.tts,
        provider: "elevenlabs",
        elevenlabs: {
          ...config.tts.elevenlabs,
          apiKey: value,
          voiceId: config.tts.elevenlabs?.voiceId || "",
        },
      },
    });
    console.log("ElevenLabs API key set");
  } else if (key === "voice_id") {
    await saveConfig({
      tts: {
        ...config.tts,
        provider: "elevenlabs",
        elevenlabs: {
          ...config.tts.elevenlabs,
          apiKey: config.tts.elevenlabs?.apiKey || "",
          voiceId: value,
        },
      },
    });
    console.log(`ElevenLabs voice ID set to: ${value}`);
  } else {
    console.error("Error: Unknown ElevenLabs config key. Use: api_key, voice_id");
    process.exit(1);
  }
}

if (!command || command === "show") {
  await showStatus();
} else if (command === "provider") {
  const provider = args[1];
  if (!provider) {
    console.error("Error: Specify a provider (macos, elevenlabs)");
    process.exit(1);
  }
  await setProvider(provider);
} else if (command === "elevenlabs") {
  const key = args[1];
  const value = args.slice(2).join(" ");
  if (!key || !value) {
    console.error("Usage: /herald:tts elevenlabs <api_key|voice_id> <value>");
    process.exit(1);
  }
  await setElevenLabsConfig(key, value);
} else {
  console.error("Unknown command. Use: show, provider <name>, elevenlabs <key> <value>");
  process.exit(1);
}
