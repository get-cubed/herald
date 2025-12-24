import { registerProvider, getProvider, getAvailableProviders, } from "./provider.js";
import { MacOSTTSProvider } from "./macos.js";
import { WindowsTTSProvider } from "./windows.js";
import { ElevenLabsTTSProvider } from "./elevenlabs.js";
// Register built-in providers
registerProvider("macos", () => new MacOSTTSProvider());
registerProvider("windows", () => new WindowsTTSProvider());
registerProvider("elevenlabs", (config) => new ElevenLabsTTSProvider(config));
// Re-export for convenience
export { getProvider, getAvailableProviders, registerProvider };
/**
 * Get the default TTS provider for the current platform.
 */
export function getDefaultProvider() {
    if (process.platform === "win32")
        return "windows";
    if (process.platform === "darwin")
        return "macos";
    return "macos"; // Fallback, though it won't work on Linux without espeak
}
