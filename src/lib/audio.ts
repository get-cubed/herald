import { spawn } from "child_process";

/**
 * Escape a string for safe use in AppleScript.
 * Escapes backslashes and double quotes.
 */
export function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Escape a string for safe use in PowerShell single-quoted strings.
 * Single quotes are escaped by doubling them.
 */
export function escapePowerShell(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Play a system sound in a cross-platform way.
 * @param type - The type of sound: "alert" (task complete) or "ping" (notification)
 */
export function playSound(type: "alert" | "ping"): void {
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS: Use afplay with system sounds
    const sound = type === "alert"
      ? "/System/Library/Sounds/Glass.aiff"
      : "/System/Library/Sounds/Ping.aiff";
    spawn("afplay", [sound], {
      stdio: "ignore",
      detached: true,
    }).unref();
  } else if (platform === "win32") {
    // Windows: Use PowerShell to play system sounds
    const sound = type === "alert"
      ? "[System.Media.SystemSounds]::Exclamation.Play()"
      : "[System.Media.SystemSounds]::Asterisk.Play()";
    spawn("powershell", ["-Command", sound], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();
  } else {
    // Linux: Try paplay (PulseAudio) or aplay (ALSA)
    // Most distros have some sound at these paths
    const sound = "/usr/share/sounds/freedesktop/stereo/complete.oga";
    spawn("paplay", [sound], {
      stdio: "ignore",
      detached: true,
    }).unref();
  }
}

/**
 * Detect which application Claude Code is running in.
 * Returns the app name for activation purposes.
 */
export function detectTerminalApp(): { app: string; process?: string } {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || "";
  const terminalEmulator = process.env.TERMINAL_EMULATOR?.toLowerCase() || "";

  // VS Code integrated terminal
  if (termProgram === "vscode") {
    return { app: "Visual Studio Code", process: "Code" };
  }

  // Popular terminal emulators
  if (termProgram === "ghostty" || terminalEmulator.includes("ghostty")) {
    return { app: "Ghostty", process: "ghostty" };
  }
  if (termProgram === "iterm.app") {
    return { app: "iTerm", process: "iTerm2" };
  }
  if (termProgram === "apple_terminal") {
    return { app: "Terminal", process: "Terminal" };
  }
  if (termProgram === "alacritty") {
    return { app: "Alacritty", process: "alacritty" };
  }
  if (termProgram === "kitty") {
    return { app: "kitty", process: "kitty" };
  }
  if (termProgram === "wezterm") {
    return { app: "WezTerm", process: "wezterm-gui" };
  }
  if (termProgram === "hyper") {
    return { app: "Hyper", process: "Hyper" };
  }

  // Windows Terminal detection
  if (process.env.WT_SESSION) {
    return { app: "Windows Terminal", process: "WindowsTerminal" };
  }

  // Fallback to VS Code
  return { app: "Visual Studio Code", process: "Code" };
}

/**
 * Activate the editor or terminal window (bring to front).
 * Automatically detects whether running in VS Code or a terminal emulator.
 * Cross-platform support.
 * @param projectName - Optional project/folder name to find the correct window
 */
export function activateEditor(projectName?: string): void {
  const platform = process.platform;
  const terminal = detectTerminalApp();

  if (platform === "darwin") {
    // macOS: Use AppleScript to activate the detected app
    // Escape user input to prevent AppleScript injection
    const safeProcess = escapeAppleScript(terminal.process || "");
    const safeProject = projectName ? escapeAppleScript(projectName) : "";
    const safeApp = escapeAppleScript(terminal.app);

    const script = projectName && terminal.process
      ? `
        tell application "System Events"
          tell process "${safeProcess}"
            set frontmost to true
            repeat with w in windows
              if name of w contains "${safeProject}" then
                perform action "AXRaise" of w
                exit repeat
              end if
            end repeat
          end tell
        end tell
      `
      : `tell application "${safeApp}" to activate`;
    spawn("osascript", ["-e", script], {
      stdio: "ignore",
      detached: true,
    }).unref();
  } else if (platform === "win32") {
    // Windows: Use PowerShell with COM automation
    // Escape user input to prevent PowerShell injection
    const safeTitle = escapePowerShell(projectName || terminal.app);
    const script = `
      $shell = New-Object -ComObject WScript.Shell
      $shell.AppActivate('${safeTitle}')
    `;
    spawn("powershell", ["-Command", script], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();
  } else {
    // Linux: wmctrl with arguments array (safe from injection)
    const windowTitle = projectName || terminal.app;
    spawn("wmctrl", ["-a", windowTitle], {
      stdio: "ignore",
      detached: true,
    }).unref();
  }
}

/**
 * Play alert sound and activate editor/terminal.
 * @param projectName - Optional project name to find the correct window
 */
export function playAlert(projectName?: string): void {
  playSound("alert");
  activateEditor(projectName);
}

/**
 * Play ping/notification sound and activate editor/terminal.
 * @param projectName - Optional project name to find the correct window
 */
export function playPing(projectName?: string): void {
  playSound("ping");
  activateEditor(projectName);
}
