import { spawn } from "child_process";
/**
 * Windows TTS provider using PowerShell's built-in speech synthesis.
 * Works on Windows only.
 */
export class WindowsTTSProvider {
    name = "Windows SAPI";
    async speak(message) {
        // Escape single quotes for PowerShell
        const escaped = message.replace(/'/g, "''");
        const script = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')`;
        return new Promise((resolve) => {
            const proc = spawn("powershell", ["-Command", script], {
                stdio: "ignore",
                shell: true,
            });
            proc.on("close", () => resolve());
            proc.on("error", () => resolve());
        });
    }
    isAvailable() {
        return Promise.resolve(process.platform === "win32");
    }
}
