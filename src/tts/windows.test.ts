import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Create a mock process that emits events
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & { unref: () => void };
  proc.unref = vi.fn();
  return proc;
}

// Mock child_process before importing
vi.mock("child_process", () => ({
  spawn: vi.fn(() => createMockProcess()),
}));

import { WindowsTTSProvider } from "./windows.js";
import { spawn } from "child_process";

describe("WindowsTTSProvider", () => {
  let provider: WindowsTTSProvider;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new WindowsTTSProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("name", () => {
    it("returns 'Windows SAPI'", () => {
      expect(provider.name).toBe("Windows SAPI");
    });
  });

  describe("speak", () => {
    it("spawns PowerShell with speech synthesis script", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Hello world");

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        [
          "-Command",
          "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('Hello world')",
        ],
        {
          stdio: "ignore",
          shell: true,
        }
      );

      mockProc.emit("close");
      await speakPromise;
    });

    it("escapes single quotes by doubling them", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("It's John's birthday");

      const expectedScript =
        "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('It''s John''s birthday')";

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        ["-Command", expectedScript],
        expect.any(Object)
      );

      mockProc.emit("close");
      await speakPromise;
    });

    it("handles multiple consecutive single quotes", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Quote: ''test''");

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        [
          "-Command",
          expect.stringContaining("''''test''''"),
        ],
        expect.any(Object)
      );

      mockProc.emit("close");
      await speakPromise;
    });

    it("resolves when process closes", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Test message");

      let resolved = false;
      speakPromise.then(() => (resolved = true));

      await new Promise((r) => setTimeout(r, 10));
      expect(resolved).toBe(false);

      mockProc.emit("close");
      await speakPromise;
      expect(resolved).toBe(true);
    });

    it("resolves on error (fail-silent behavior)", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Test message");
      mockProc.emit("error", new Error("PowerShell not found"));

      await expect(speakPromise).resolves.toBeUndefined();
    });

    it("handles empty message", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("");

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        ["-Command", expect.stringContaining("Speak('')")],
        expect.any(Object)
      );

      mockProc.emit("close");
      await speakPromise;
    });

    it("preserves double quotes (no escaping needed)", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak('Say "hello"');

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        ["-Command", expect.stringContaining('Say "hello"')],
        expect.any(Object)
      );

      mockProc.emit("close");
      await speakPromise;
    });
  });

  describe("isAvailable", () => {
    it("returns true on Windows", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("returns false on macOS", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it("returns false on Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});
