import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
/**
 * ElevenLabs TTS provider.
 * Requires an API key and voice ID to be configured.
 *
 * Uses native Node.js fetch (Node 18+) to call the ElevenLabs API,
 * then plays the audio using platform-specific players:
 * - macOS: afplay
 * - Windows: PowerShell with Windows Media Player
 * - Linux: mpv (install with: sudo apt install mpv)
 */
export class ElevenLabsTTSProvider {
    name = "ElevenLabs";
    apiKey;
    voiceId;
    constructor(config) {
        if (!config.elevenlabs?.apiKey) {
            throw new Error("ElevenLabs API key is required");
        }
        if (!config.elevenlabs?.voiceId) {
            throw new Error("ElevenLabs voice ID is required");
        }
        this.apiKey = config.elevenlabs.apiKey;
        this.voiceId = config.elevenlabs.voiceId;
    }
    async speak(message) {
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": this.apiKey,
                },
                body: JSON.stringify({
                    text: message,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5,
                    },
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`ElevenLabs API error: ${response.status} - ${error}`);
                return;
            }
            // Save audio to temp file and play it
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            const tempFile = join(tmpdir(), `herald-${randomUUID()}.mp3`);
            await writeFile(tempFile, audioBuffer);
            await new Promise((resolve) => {
                const platform = process.platform;
                let proc;
                if (platform === "darwin") {
                    // macOS: use afplay
                    proc = spawn("afplay", [tempFile], { stdio: "ignore" });
                }
                else if (platform === "win32") {
                    // Windows: use Windows Media Player COM object for MP3 support
                    const escapedPath = tempFile.replace(/'/g, "''");
                    const script = `
            Add-Type -AssemblyName presentationCore
            $player = New-Object System.Windows.Media.MediaPlayer
            $player.Open('${escapedPath}')
            $player.Play()
            Start-Sleep -Milliseconds 100
            while ($player.NaturalDuration.HasTimeSpan -eq $false -or $player.Position -lt $player.NaturalDuration.TimeSpan) {
              Start-Sleep -Milliseconds 100
            }
            $player.Close()
          `;
                    proc = spawn("powershell", ["-Command", script], {
                        stdio: "ignore",
                        shell: true,
                    });
                }
                else {
                    // Linux: use mpv (supports MP3, widely available)
                    proc = spawn("mpv", ["--no-video", "--really-quiet", tempFile], {
                        stdio: "ignore",
                    });
                }
                proc.on("close", () => {
                    // Clean up temp file
                    unlink(tempFile).catch(() => { });
                    resolve();
                });
                proc.on("error", () => {
                    unlink(tempFile).catch(() => { });
                    resolve();
                });
            });
        }
        catch (error) {
            console.error("ElevenLabs TTS error:", error);
        }
    }
    async isAvailable() {
        // Check if API key is configured and valid
        if (!this.apiKey || !this.voiceId) {
            return false;
        }
        try {
            // Quick validation request to check API key
            const response = await fetch("https://api.elevenlabs.io/v1/user", {
                headers: {
                    "xi-api-key": this.apiKey,
                },
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
