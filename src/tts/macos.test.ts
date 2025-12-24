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

import { MacOSTTSProvider } from "./macos.js";
import { spawn } from "child_process";

describe("MacOSTTSProvider", () => {
  let provider: MacOSTTSProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MacOSTTSProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("name", () => {
    it("returns 'macOS Say'", () => {
      expect(provider.name).toBe("macOS Say");
    });
  });

  describe("speak", () => {
    it("spawns the 'say' command with the message", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Hello world");

      expect(spawn).toHaveBeenCalledWith("say", ["Hello world"], {
        stdio: "inherit",
      });

      // Simulate process completion
      mockProc.emit("close");
      await speakPromise;
    });

    it("resolves when process closes", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("Test message");

      // Should not resolve until close event
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
      mockProc.emit("error", new Error("Command not found"));

      // Should resolve, not reject
      await expect(speakPromise).resolves.toBeUndefined();
    });

    it("handles special characters in message", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const message = "Hello \"world\" with 'quotes' and $pecial chars!";
      const speakPromise = provider.speak(message);

      expect(spawn).toHaveBeenCalledWith("say", [message], {
        stdio: "inherit",
      });

      mockProc.emit("close");
      await speakPromise;
    });

    it("handles empty message", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const speakPromise = provider.speak("");

      expect(spawn).toHaveBeenCalledWith("say", [""], {
        stdio: "inherit",
      });

      mockProc.emit("close");
      await speakPromise;
    });
  });

  describe("isAvailable", () => {
    it("spawns 'which say' to check availability", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const availablePromise = provider.isAvailable();

      expect(spawn).toHaveBeenCalledWith("which", ["say"], {
        stdio: "ignore",
      });

      mockProc.emit("close", 0);
      await availablePromise;
    });

    it("returns true when 'say' command exists (exit code 0)", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const availablePromise = provider.isAvailable();
      mockProc.emit("close", 0);

      const result = await availablePromise;
      expect(result).toBe(true);
    });

    it("returns false when 'say' command not found (exit code 1)", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const availablePromise = provider.isAvailable();
      mockProc.emit("close", 1);

      const result = await availablePromise;
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      const mockProc = createMockProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as never);

      const availablePromise = provider.isAvailable();
      mockProc.emit("error", new Error("spawn error"));

      const result = await availablePromise;
      expect(result).toBe(false);
    });
  });
});
