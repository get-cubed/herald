import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import type { TTSProviderConfig } from "../types.js";

// Store mock processes to emit events on them later
let mockProcesses: EventEmitter[] = [];

// Create a mock process that emits events
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & { unref: () => void };
  proc.unref = vi.fn();
  mockProcesses.push(proc);
  return proc;
}

// Mock dependencies before importing
vi.mock("child_process", () => ({
  spawn: vi.fn(() => createMockProcess()),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-1234"),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ElevenLabsTTSProvider } from "./elevenlabs.js";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";

describe("ElevenLabsTTSProvider", () => {
  const validConfig: TTSProviderConfig = {
    provider: "elevenlabs",
    elevenlabs: {
      apiKey: "test-api-key",
      voiceId: "test-voice-id",
    },
  };

  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcesses = [];
    // Reset console.error mock
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("constructor", () => {
    it("creates provider with valid config", () => {
      const provider = new ElevenLabsTTSProvider(validConfig);
      expect(provider.name).toBe("ElevenLabs");
    });

    it("throws when API key is missing", () => {
      const config: TTSProviderConfig = {
        provider: "elevenlabs",
        elevenlabs: { apiKey: "", voiceId: "voice-id" },
      };

      expect(() => new ElevenLabsTTSProvider(config)).toThrow(
        "ElevenLabs API key is required"
      );
    });

    it("throws when API key is undefined", () => {
      const config: TTSProviderConfig = {
        provider: "elevenlabs",
      };

      expect(() => new ElevenLabsTTSProvider(config)).toThrow(
        "ElevenLabs API key is required"
      );
    });

    it("throws when voice ID is missing", () => {
      const config: TTSProviderConfig = {
        provider: "elevenlabs",
        elevenlabs: { apiKey: "api-key", voiceId: "" },
      };

      expect(() => new ElevenLabsTTSProvider(config)).toThrow(
        "ElevenLabs voice ID is required"
      );
    });
  });

  describe("name", () => {
    it("returns 'ElevenLabs'", () => {
      const provider = new ElevenLabsTTSProvider(validConfig);
      expect(provider.name).toBe("ElevenLabs");
    });
  });

  describe("speak", () => {
    it("makes API request with correct parameters", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Hello world");

      // Wait for fetch to complete and spawn to be called
      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/test-voice-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": "test-api-key",
          },
          body: JSON.stringify({
            text: "Hello world",
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );
    });

    it("writes audio to temp file", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      const audioData = new Uint8Array([1, 2, 3, 4]).buffer;
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(audioData),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("herald-test-uuid-1234.mp3"),
        expect.any(Buffer)
      );
    });

    it("uses afplay on macOS", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(spawn).toHaveBeenCalledWith(
        "afplay",
        [expect.stringContaining("herald-test-uuid-1234.mp3")],
        { stdio: "ignore" }
      );
    });

    it("uses PowerShell on Windows", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(spawn).toHaveBeenCalledWith(
        "powershell",
        ["-Command", expect.stringContaining("MediaPlayer")],
        { stdio: "ignore", shell: true }
      );
    });

    it("uses mpv on Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(spawn).toHaveBeenCalledWith(
        "mpv",
        ["--no-video", "--really-quiet", expect.stringContaining(".mp3")],
        { stdio: "ignore" }
      );
    });

    it("cleans up temp file after playback", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("close");
      await speakPromise;

      expect(unlink).toHaveBeenCalledWith(
        expect.stringContaining("herald-test-uuid-1234.mp3")
      );
    });

    it("cleans up temp file on player error", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const speakPromise = provider.speak("Test");

      await vi.waitFor(() => expect(mockProcesses.length).toBeGreaterThan(0));
      mockProcesses[0].emit("error", new Error("Player not found"));
      await speakPromise;

      expect(unlink).toHaveBeenCalled();
    });

    it("handles API error response gracefully", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await provider.speak("Test");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("ElevenLabs API error: 401")
      );
      // Should not try to play audio
      expect(spawn).not.toHaveBeenCalled();
    });

    it("handles fetch exception gracefully", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockRejectedValue(new Error("Network error"));

      await provider.speak("Test");

      expect(console.error).toHaveBeenCalledWith(
        "ElevenLabs TTS error:",
        expect.any(Error)
      );
    });
  });

  describe("isAvailable", () => {
    it("returns true when API responds with ok", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({ ok: true });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("calls user endpoint to validate API key", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({ ok: true });

      await provider.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/user",
        {
          headers: {
            "xi-api-key": "test-api-key",
          },
        }
      );
    });

    it("returns false when API responds with error", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it("returns false when fetch throws", async () => {
      const provider = new ElevenLabsTTSProvider(validConfig);

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});
