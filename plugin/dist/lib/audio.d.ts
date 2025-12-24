/**
 * Escape a string for safe use in AppleScript.
 * Escapes backslashes and double quotes.
 */
export declare function escapeAppleScript(str: string): string;
/**
 * Escape a string for safe use in PowerShell single-quoted strings.
 * Single quotes are escaped by doubling them.
 */
export declare function escapePowerShell(str: string): string;
/**
 * Play a system sound in a cross-platform way.
 * @param type - The type of sound: "alert" (task complete) or "ping" (notification)
 */
export declare function playSound(type: "alert" | "ping"): void;
/**
 * Detect which application Claude Code is running in.
 * Returns the app name for activation purposes.
 */
export declare function detectTerminalApp(): {
    app: string;
    process?: string;
};
/**
 * Activate the editor or terminal window (bring to front).
 * Automatically detects whether running in VS Code or a terminal emulator.
 * Cross-platform support.
 * @param projectName - Optional project/folder name to find the correct window
 */
export declare function activateEditor(projectName?: string): void;
/**
 * Play alert sound and activate editor/terminal.
 * @param projectName - Optional project name to find the correct window
 */
export declare function playAlert(projectName?: string): void;
/**
 * Play ping/notification sound and activate editor/terminal.
 * @param projectName - Optional project name to find the correct window
 */
export declare function playPing(projectName?: string): void;
