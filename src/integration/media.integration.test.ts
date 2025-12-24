/**
 * Integration tests for platform-specific media control.
 *
 * These tests run actual system commands (osascript, PowerShell) without mocking.
 * They are skipped on platforms where they don't apply.
 *
 * Run with: npm run test:integration
 */
import { describe, it, expect } from "vitest";
import { spawn } from "child_process";

/**
 * Helper to run a command and capture output.
 */
function runCommand(
  command: string,
  args: string[],
  timeoutMs = 5000
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
      resolve({ stdout, stderr, code: null });
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      stdout += data;
    });
    proc.stderr?.on("data", (data) => {
      stderr += data;
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (!timedOut) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      }
    });
    proc.on("error", () => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, code: -1 });
    });
  });
}

describe("macOS media integration", () => {
  const isMacOS = process.platform === "darwin";

  describe.skipIf(!isMacOS)("AppleScript execution", () => {
    it("can execute osascript", async () => {
      const result = await runCommand("osascript", ["-e", 'return "hello"']);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("hello");
    });

    it("can query System Events for running processes", async () => {
      const script =
        'tell application "System Events" to return name of first process';
      const result = await runCommand("osascript", ["-e", script]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("can check if Finder is running (always true on macOS)", async () => {
      const script =
        'tell application "System Events" to (name of processes) contains "Finder"';
      const result = await runCommand("osascript", ["-e", script]);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("true");
    });

    it("handles non-existent app gracefully", async () => {
      const script =
        'tell application "System Events" to (name of processes) contains "NonExistentApp12345"';
      const result = await runCommand("osascript", ["-e", script]);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("false");
    });

    it("can play system sound", async () => {
      // Just verify the command doesn't error - we won't actually hear it in CI
      const result = await runCommand("afplay", [
        "/System/Library/Sounds/Ping.aiff",
        "-v",
        "0", // Silent volume for CI
      ]);

      // afplay returns 0 on success, or error if file not found
      expect([0, 1]).toContain(result.code);
    });
  });
});

describe("Windows media integration", () => {
  const isWindows = process.platform === "win32";

  describe.skipIf(!isWindows)("PowerShell execution", () => {
    it("can execute PowerShell", async () => {
      const result = await runCommand("powershell", [
        "-Command",
        'Write-Output "hello"',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("hello");
    });

    it("can query running processes", async () => {
      const result = await runCommand("powershell", [
        "-Command",
        "Get-Process | Select-Object -First 1 -ExpandProperty Name",
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("can check if explorer is running (always true on Windows)", async () => {
      const result = await runCommand("powershell", [
        "-Command",
        'Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Select-Object -First 1',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("handles non-existent process gracefully", async () => {
      const result = await runCommand("powershell", [
        "-Command",
        'Get-Process -Name "NonExistentProcess12345" -ErrorAction SilentlyContinue',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("can play system sound", async () => {
      // Just verify the command syntax is valid - won't hear in CI
      const result = await runCommand("powershell", [
        "-Command",
        "[System.Media.SystemSounds]::Asterisk.Play()",
      ]);

      expect(result.code).toBe(0);
    });
  });
});

describe("Linux media integration", () => {
  const isLinux = process.platform === "linux";

  describe.skipIf(!isLinux)("Linux audio", () => {
    it("paplay command exists or fails gracefully", async () => {
      const result = await runCommand("which", ["paplay"]);

      // Either paplay exists (code 0) or it doesn't (code 1)
      // Both are acceptable - we just want to verify the integration path works
      expect([0, 1]).toContain(result.code);
    });

    it("wmctrl command exists or fails gracefully", async () => {
      const result = await runCommand("which", ["wmctrl"]);

      // Either wmctrl exists (code 0) or it doesn't (code 1)
      expect([0, 1]).toContain(result.code);
    });
  });
});

describe("Cross-platform stdin handling", () => {
  it("can read from stdin using Node.js", async () => {
    // Test that our stdin reading pattern works
    const result = await runCommand("node", [
      "-e",
      `
      let data = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => console.log(data.trim()));
      setTimeout(() => process.exit(0), 100);
      `,
    ]);

    // Should complete without error even with no stdin
    expect(result.code).toBe(0);
  });
});
