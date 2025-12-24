import type { ITTSProvider } from "./provider.js";
/**
 * macOS TTS provider using the built-in `say` command.
 * Works on macOS only.
 */
export declare class MacOSTTSProvider implements ITTSProvider {
    readonly name = "macOS Say";
    speak(message: string): Promise<void>;
    isAvailable(): Promise<boolean>;
}
