import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock child_process before importing audio
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
  })),
}));

import {
  escapeAppleScript,
  escapePowerShell,
  detectTerminalApp,
  playSound,
  activateEditor,
  playAlert,
  playPing,
} from "./audio.js";
import { spawn } from "child_process";

describe("audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("escapeAppleScript", () => {
    it("escapes double quotes", () => {
      expect(escapeAppleScript('Say "hello"')).toBe('Say \\"hello\\"');
    });

    it("escapes backslashes", () => {
      expect(escapeAppleScript("path\\to\\file")).toBe("path\\\\to\\\\file");
    });

    it("escapes both quotes and backslashes", () => {
      expect(escapeAppleScript('path\\to\\"file"')).toBe(
        'path\\\\to\\\\\\"file\\"'
      );
    });

    it("leaves safe strings unchanged", () => {
      expect(escapeAppleScript("Hello World")).toBe("Hello World");
    });

    it("handles empty string", () => {
      expect(escapeAppleScript("")).toBe("");
    });

    it("handles multiple consecutive quotes", () => {
      expect(escapeAppleScript('""')).toBe('\\"\\"');
    });

    it("handles multiple consecutive backslashes", () => {
      expect(escapeAppleScript("\\\\")).toBe("\\\\\\\\");
    });

    it("handles real-world project name with special chars", () => {
      expect(escapeAppleScript('my-project "v2"')).toBe('my-project \\"v2\\"');
    });
  });

  describe("escapePowerShell", () => {
    it("escapes single quotes by doubling", () => {
      expect(escapePowerShell("don't")).toBe("don''t");
    });

    it("handles multiple single quotes", () => {
      expect(escapePowerShell("it's John's")).toBe("it''s John''s");
    });

    it("leaves double quotes unchanged", () => {
      expect(escapePowerShell('"quoted"')).toBe('"quoted"');
    });

    it("leaves safe strings unchanged", () => {
      expect(escapePowerShell("Hello World")).toBe("Hello World");
    });

    it("handles empty string", () => {
      expect(escapePowerShell("")).toBe("");
    });

    it("handles consecutive single quotes", () => {
      expect(escapePowerShell("''")).toBe("''''");
    });

    it("handles real-world path with apostrophe", () => {
      expect(escapePowerShell("O'Brien's Project")).toBe("O''Brien''s Project");
    });
  });

  describe("detectTerminalApp", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("detects VS Code", () => {
      process.env.TERM_PROGRAM = "vscode";
      expect(detectTerminalApp()).toEqual({
        app: "Visual Studio Code",
        process: "Code",
      });
    });

    it("detects VS Code case-insensitively", () => {
      process.env.TERM_PROGRAM = "VSCode";
      expect(detectTerminalApp()).toEqual({
        app: "Visual Studio Code",
        process: "Code",
      });
    });

    it("detects Ghostty via TERM_PROGRAM", () => {
      process.env.TERM_PROGRAM = "ghostty";
      expect(detectTerminalApp()).toEqual({
        app: "Ghostty",
        process: "ghostty",
      });
    });

    it("detects Ghostty via TERMINAL_EMULATOR", () => {
      process.env.TERM_PROGRAM = "";
      process.env.TERMINAL_EMULATOR = "ghostty";
      expect(detectTerminalApp()).toEqual({
        app: "Ghostty",
        process: "ghostty",
      });
    });

    it("detects iTerm", () => {
      process.env.TERM_PROGRAM = "iTerm.app";
      expect(detectTerminalApp()).toEqual({
        app: "iTerm",
        process: "iTerm2",
      });
    });

    it("detects Apple Terminal", () => {
      process.env.TERM_PROGRAM = "Apple_Terminal";
      expect(detectTerminalApp()).toEqual({
        app: "Terminal",
        process: "Terminal",
      });
    });

    it("detects Alacritty", () => {
      process.env.TERM_PROGRAM = "Alacritty";
      expect(detectTerminalApp()).toEqual({
        app: "Alacritty",
        process: "alacritty",
      });
    });

    it("detects Kitty", () => {
      process.env.TERM_PROGRAM = "kitty";
      expect(detectTerminalApp()).toEqual({
        app: "kitty",
        process: "kitty",
      });
    });

    it("detects WezTerm", () => {
      process.env.TERM_PROGRAM = "WezTerm";
      expect(detectTerminalApp()).toEqual({
        app: "WezTerm",
        process: "wezterm-gui",
      });
    });

    it("detects Hyper", () => {
      process.env.TERM_PROGRAM = "Hyper";
      expect(detectTerminalApp()).toEqual({
        app: "Hyper",
        process: "Hyper",
      });
    });

    it("detects Windows Terminal via WT_SESSION", () => {
      process.env.TERM_PROGRAM = "";
      process.env.WT_SESSION = "some-session-id";
      expect(detectTerminalApp()).toEqual({
        app: "Windows Terminal",
        process: "WindowsTerminal",
      });
    });

    it("defaults to VS Code when unknown", () => {
      process.env.TERM_PROGRAM = "unknown-terminal";
      delete process.env.WT_SESSION;
      expect(detectTerminalApp()).toEqual({
        app: "Visual Studio Code",
        process: "Code",
      });
    });

    it("defaults to VS Code when no env vars set", () => {
      delete process.env.TERM_PROGRAM;
      delete process.env.TERMINAL_EMULATOR;
      delete process.env.WT_SESSION;
      expect(detectTerminalApp()).toEqual({
        app: "Visual Studio Code",
        process: "Code",
      });
    });
  });

  describe("playSound", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    describe("on macOS", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "darwin" });
      });

      it("plays Glass sound for alert", () => {
        playSound("alert");

        expect(spawn).toHaveBeenCalledWith(
          "afplay",
          ["/System/Library/Sounds/Glass.aiff"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });

      it("plays Ping sound for ping", () => {
        playSound("ping");

        expect(spawn).toHaveBeenCalledWith(
          "afplay",
          ["/System/Library/Sounds/Ping.aiff"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });
    });

    describe("on Windows", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "win32" });
      });

      it("plays Exclamation for alert", () => {
        playSound("alert");

        expect(spawn).toHaveBeenCalledWith(
          "powershell",
          ["-Command", "[System.Media.SystemSounds]::Exclamation.Play()"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
            shell: true,
          })
        );
      });

      it("plays Asterisk for ping", () => {
        playSound("ping");

        expect(spawn).toHaveBeenCalledWith(
          "powershell",
          ["-Command", "[System.Media.SystemSounds]::Asterisk.Play()"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
            shell: true,
          })
        );
      });
    });

    describe("on Linux", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "linux" });
      });

      it("uses paplay for sounds", () => {
        playSound("alert");

        expect(spawn).toHaveBeenCalledWith(
          "paplay",
          ["/usr/share/sounds/freedesktop/stereo/complete.oga"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });
    });
  });

  describe("activateEditor", () => {
    const originalPlatform = process.platform;
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env.TERM_PROGRAM = "vscode";
    });

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      process.env = { ...originalEnv };
    });

    describe("on macOS", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "darwin" });
      });

      it("runs osascript to activate app", () => {
        activateEditor();

        expect(spawn).toHaveBeenCalledWith(
          "osascript",
          expect.arrayContaining(["-e"]),
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });

      it("includes project name in window search when provided", () => {
        activateEditor("my-project");

        const spawnCall = vi.mocked(spawn).mock.calls[0];
        const script = spawnCall[1][1];

        expect(script).toContain("my-project");
        expect(script).toContain("AXRaise");
      });

      it("escapes special characters in project name", () => {
        activateEditor('project "with quotes"');

        const spawnCall = vi.mocked(spawn).mock.calls[0];
        const script = spawnCall[1][1];

        expect(script).toContain('\\"with quotes\\"');
      });

      it("uses simple activate when no project name", () => {
        activateEditor();

        const spawnCall = vi.mocked(spawn).mock.calls[0];
        const script = spawnCall[1][1];

        expect(script).toContain("activate");
      });
    });

    describe("on Windows", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "win32" });
      });

      it("runs PowerShell to activate window", () => {
        activateEditor();

        expect(spawn).toHaveBeenCalledWith(
          "powershell",
          expect.arrayContaining(["-Command"]),
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
            shell: true,
          })
        );
      });

      it("uses AppActivate with project name", () => {
        activateEditor("my-project");

        const spawnCall = vi.mocked(spawn).mock.calls[0];
        const script = spawnCall[1][1];

        expect(script).toContain("AppActivate");
        expect(script).toContain("my-project");
      });

      it("escapes single quotes in project name", () => {
        activateEditor("O'Brien's Project");

        const spawnCall = vi.mocked(spawn).mock.calls[0];
        const script = spawnCall[1][1];

        expect(script).toContain("O''Brien''s Project");
      });
    });

    describe("on Linux", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", { value: "linux" });
      });

      it("uses wmctrl to activate window", () => {
        activateEditor("my-project");

        expect(spawn).toHaveBeenCalledWith(
          "wmctrl",
          ["-a", "my-project"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });

      it("uses detected app name when no project name", () => {
        activateEditor();

        expect(spawn).toHaveBeenCalledWith(
          "wmctrl",
          ["-a", "Visual Studio Code"],
          expect.objectContaining({
            stdio: "ignore",
            detached: true,
          })
        );
      });
    });
  });

  describe("playAlert", () => {
    it("plays sound and activates editor", () => {
      playAlert("my-project");

      // Should call spawn twice: once for sound, once for activation
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it("works without project name", () => {
      playAlert();

      expect(spawn).toHaveBeenCalled();
    });
  });

  describe("playPing", () => {
    it("plays sound and activates editor", () => {
      playPing("my-project");

      // Should call spawn twice: once for sound, once for activation
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it("works without project name", () => {
      playPing();

      expect(spawn).toHaveBeenCalled();
    });
  });
});
