import type { ITTSProvider } from "./provider.js";
/**
 * Windows TTS provider using PowerShell's built-in speech synthesis.
 * Works on Windows only.
 */
export declare class WindowsTTSProvider implements ITTSProvider {
    readonly name = "Windows SAPI";
    speak(message: string): Promise<void>;
    isAvailable(): Promise<boolean>;
}
