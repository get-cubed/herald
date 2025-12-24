import { homedir } from "os";
import { join, dirname } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { DEFAULT_CONFIG } from "../types.js";
const CONFIG_PATH = join(homedir(), ".config", "herald", "config.json");
/**
 * Get the default TTS provider for the current platform.
 */
function getDefaultTTSProvider() {
    if (process.platform === "win32")
        return "windows";
    return "macos";
}
/**
 * Get platform-aware default config.
 */
function getPlatformDefaults() {
    return {
        ...DEFAULT_CONFIG,
        tts: {
            ...DEFAULT_CONFIG.tts,
            provider: getDefaultTTSProvider(),
        },
    };
}
export async function loadConfig() {
    const defaults = getPlatformDefaults();
    try {
        if (existsSync(CONFIG_PATH)) {
            const text = await readFile(CONFIG_PATH, "utf-8");
            const data = JSON.parse(text);
            return {
                ...defaults,
                ...data,
                tts: {
                    ...defaults.tts,
                    ...(data.tts || {}),
                },
                preferences: {
                    ...defaults.preferences,
                    ...(data.preferences || {}),
                },
            };
        }
    }
    catch {
        // Fall through to default
    }
    return defaults;
}
export async function saveConfig(config) {
    const existing = await loadConfig();
    const merged = {
        ...existing,
        ...config,
        tts: {
            ...existing.tts,
            ...config.tts,
        },
        preferences: {
            ...existing.preferences,
            ...config.preferences,
        },
    };
    const dir = dirname(CONFIG_PATH);
    await mkdir(dir, { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2));
}
export { CONFIG_PATH };
