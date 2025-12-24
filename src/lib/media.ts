import { spawn } from "child_process";

interface MediaPlayer {
  name: string;
  bundleId?: string;
  processName?: string;
}

interface MediaState {
  player: MediaPlayer;
  wasPlaying: boolean;
}

// macOS supported players
const MACOS_PLAYERS: MediaPlayer[] = [
  { name: "Spotify", bundleId: "com.spotify.client" },
  { name: "Music", bundleId: "com.apple.Music" },
  { name: "VLC", bundleId: "org.videolan.vlc" },
  { name: "Deezer", bundleId: "com.deezer.deezer" },
  { name: "TIDAL", bundleId: "com.tidal.desktop" },
];

// Windows supported players
const WINDOWS_PLAYERS: MediaPlayer[] = [
  { name: "Spotify", processName: "Spotify" },
  { name: "iTunes", processName: "iTunes" },
  { name: "VLC", processName: "vlc" },
];

// Track paused players for resume
let pausedPlayers: MediaState[] = [];

/**
 * Run an AppleScript command with timeout.
 */
function runAppleScript(script: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("osascript", ["-e", script], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error("AppleScript timeout"));
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      stdout += data;
    });
    proc.stderr?.on("data", (data) => {
      stderr += data;
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) return;
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `osascript exited with code ${code}`));
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Run a PowerShell command with timeout.
 */
function runPowerShell(script: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("powershell", ["-Command", script], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let stdout = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error("PowerShell timeout"));
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      stdout += data;
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) return;
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`PowerShell exited with code ${code}`));
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Check if a macOS app is running (without launching it).
 */
async function isMacAppRunning(appName: string): Promise<boolean> {
  try {
    const script = `tell application "System Events" to (name of processes) contains "${appName}"`;
    const result = await runAppleScript(script);
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Check if a macOS media player is currently playing.
 */
async function isMacPlayerPlaying(player: MediaPlayer): Promise<boolean> {
  try {
    const isRunning = await isMacAppRunning(player.name);
    if (!isRunning) return false;

    const script = `tell application "${player.name}" to return player state`;
    const result = await runAppleScript(script);
    // Spotify returns "playing", Music returns "kPSP" (playing)
    return result === "playing" || result === "kPSP";
  } catch {
    return false;
  }
}

/**
 * Pause a macOS media player.
 */
async function pauseMacPlayer(player: MediaPlayer): Promise<boolean> {
  try {
    const script = `tell application "${player.name}" to pause`;
    await runAppleScript(script);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resume a macOS media player.
 */
async function resumeMacPlayer(player: MediaPlayer): Promise<boolean> {
  try {
    const script = `tell application "${player.name}" to play`;
    await runAppleScript(script);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a Windows process is running.
 */
async function isWindowsProcessRunning(processName: string): Promise<boolean> {
  try {
    const script = `Get-Process -Name "${processName}" -ErrorAction SilentlyContinue | Select-Object -First 1`;
    const result = await runPowerShell(script);
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Send media play/pause key on Windows.
 * This works with any media player that responds to media keys.
 */
async function toggleWindowsMediaKey(): Promise<boolean> {
  try {
    const script = `
      $signature = @"
[DllImport("user32.dll")]
public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
"@
      $SendKey = Add-Type -MemberDefinition $signature -Name "Win32SendKey" -Namespace Win32Functions -PassThru
      $SendKey::keybd_event(0xB3, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 50
      $SendKey::keybd_event(0xB3, 0, 2, [UIntPtr]::Zero)
    `;
    await runPowerShell(script);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pause all playing media on macOS.
 */
async function pauseMacMedia(): Promise<MediaState[]> {
  const paused: MediaState[] = [];

  for (const player of MACOS_PLAYERS) {
    try {
      const isPlaying = await isMacPlayerPlaying(player);
      if (isPlaying) {
        const success = await pauseMacPlayer(player);
        if (success) {
          paused.push({ player, wasPlaying: true });
        }
      }
    } catch {
      // Ignore errors, media control is best-effort
    }
  }

  return paused;
}

/**
 * Resume previously paused media on macOS.
 */
async function resumeMacMedia(states: MediaState[]): Promise<void> {
  for (const state of states) {
    if (state.wasPlaying) {
      try {
        await resumeMacPlayer(state.player);
      } catch {
        // Ignore errors
      }
    }
  }
}

/**
 * Pause media on Windows using media key.
 */
async function pauseWindowsMedia(): Promise<MediaState[]> {
  // Check if any known player is running
  let anyRunning = false;
  for (const player of WINDOWS_PLAYERS) {
    if (player.processName) {
      const running = await isWindowsProcessRunning(player.processName);
      if (running) {
        anyRunning = true;
        break;
      }
    }
  }

  if (anyRunning) {
    const success = await toggleWindowsMediaKey();
    if (success) {
      // We can't know which player was playing, so we mark a generic state
      return [{ player: { name: "MediaKey" }, wasPlaying: true }];
    }
  }

  return [];
}

/**
 * Resume media on Windows using media key.
 */
async function resumeWindowsMedia(states: MediaState[]): Promise<void> {
  if (states.length > 0 && states[0].wasPlaying) {
    await toggleWindowsMediaKey();
  }
}

/**
 * Pause all playing media and store state for later resume.
 */
export async function pauseMedia(): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      pausedPlayers = await pauseMacMedia();
    } else if (platform === "win32") {
      pausedPlayers = await pauseWindowsMedia();
    }
  } catch {
    // Fail silently - media control should never block TTS
    pausedPlayers = [];
  }
}

/**
 * Resume media that was previously paused.
 */
export async function resumeMedia(): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      await resumeMacMedia(pausedPlayers);
    } else if (platform === "win32") {
      await resumeWindowsMedia(pausedPlayers);
    }
  } catch {
    // Fail silently
  }

  pausedPlayers = [];
}

/**
 * Wrap a TTS function with automatic media pause/resume.
 */
export async function withMediaControl<T>(
  ttsFn: () => Promise<T>
): Promise<T> {
  await pauseMedia();
  try {
    return await ttsFn();
  } finally {
    // Small delay before resume to avoid audio overlap
    await new Promise((resolve) => setTimeout(resolve, 300));
    await resumeMedia();
  }
}
