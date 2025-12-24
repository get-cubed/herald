import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";

// Mock fs modules before importing config
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/mock/home"),
}));

// Import after mocks are set up
import { loadConfig, saveConfig, CONFIG_PATH } from "./config.js";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { HeraldConfig } from "../types.js";

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CONFIG_PATH", () => {
    it("points to correct location", () => {
      expect(CONFIG_PATH).toBe(
        join("/mock/home", ".config", "herald", "config.json")
      );
    });
  });

  describe("loadConfig", () => {
    describe("when config file does not exist", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(false);
      });

      it("returns default config", async () => {
        const config = await loadConfig();

        expect(config.enabled).toBe(true);
        expect(config.style).toBe("alerts");
        expect(config.preferences.max_words).toBe(50);
        expect(config.preferences.summary_prompt).toBeNull();
        expect(config.preferences.activate_editor).toBe(true);
      });

      it("uses macos as default TTS provider on darwin", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });

        const config = await loadConfig();
        expect(config.tts.provider).toBe("macos");

        Object.defineProperty(process, "platform", { value: originalPlatform });
      });

      it("uses windows as default TTS provider on win32", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        const config = await loadConfig();
        expect(config.tts.provider).toBe("windows");

        Object.defineProperty(process, "platform", { value: originalPlatform });
      });
    });

    describe("when config file exists", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
      });

      it("merges user config with defaults", async () => {
        const userConfig = {
          enabled: false,
          style: "tts",
        };
        vi.mocked(readFile).mockResolvedValue(JSON.stringify(userConfig));

        const config = await loadConfig();

        expect(config.enabled).toBe(false);
        expect(config.style).toBe("tts");
        // Defaults should still be present
        expect(config.preferences.max_words).toBe(50);
      });

      it("merges nested tts config", async () => {
        const userConfig = {
          tts: {
            provider: "elevenlabs",
            elevenlabs: {
              apiKey: "test-key",
              voiceId: "test-voice",
            },
          },
        };
        vi.mocked(readFile).mockResolvedValue(JSON.stringify(userConfig));

        const config = await loadConfig();

        expect(config.tts.provider).toBe("elevenlabs");
        expect(config.tts.elevenlabs?.apiKey).toBe("test-key");
        expect(config.tts.elevenlabs?.voiceId).toBe("test-voice");
      });

      it("merges nested preferences config", async () => {
        const userConfig = {
          preferences: {
            max_words: 100,
            activate_editor: false,
          },
        };
        vi.mocked(readFile).mockResolvedValue(JSON.stringify(userConfig));

        const config = await loadConfig();

        expect(config.preferences.max_words).toBe(100);
        expect(config.preferences.activate_editor).toBe(false);
        expect(config.preferences.summary_prompt).toBeNull(); // Default
      });

      it("handles partial preferences", async () => {
        const userConfig = {
          preferences: {
            max_words: 75,
          },
        };
        vi.mocked(readFile).mockResolvedValue(JSON.stringify(userConfig));

        const config = await loadConfig();

        expect(config.preferences.max_words).toBe(75);
        expect(config.preferences.summary_prompt).toBeNull();
        expect(config.preferences.activate_editor).toBe(true);
      });
    });

    describe("error handling", () => {
      it("returns defaults when file read fails", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockRejectedValue(new Error("Read error"));

        const config = await loadConfig();

        expect(config.enabled).toBe(true);
        expect(config.style).toBe("alerts");
      });

      it("returns defaults when JSON is invalid", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue("not valid json");

        const config = await loadConfig();

        expect(config.enabled).toBe(true);
        expect(config.style).toBe("alerts");
      });

      it("returns defaults when file contains empty object", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue("{}");

        const config = await loadConfig();

        expect(config.enabled).toBe(true);
        expect(config.style).toBe("alerts");
        expect(config.preferences.max_words).toBe(50);
      });
    });
  });

  describe("saveConfig", () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
    });

    it("creates config directory", async () => {
      await saveConfig({ enabled: false });

      expect(mkdir).toHaveBeenCalledWith(
        join("/mock/home", ".config", "herald"),
        { recursive: true }
      );
    });

    it("writes merged config to file", async () => {
      await saveConfig({ enabled: false });

      expect(writeFile).toHaveBeenCalledWith(
        CONFIG_PATH,
        expect.any(String)
      );

      const writtenConfig = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string
      );
      expect(writtenConfig.enabled).toBe(false);
      expect(writtenConfig.style).toBe("alerts"); // Default preserved
    });

    it("merges with existing config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          enabled: true,
          style: "tts",
          preferences: { max_words: 100 },
        })
      );

      await saveConfig({ style: "alerts" });

      const writtenConfig = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string
      );
      expect(writtenConfig.enabled).toBe(true); // From existing
      expect(writtenConfig.style).toBe("alerts"); // Updated
      expect(writtenConfig.preferences.max_words).toBe(100); // From existing
    });

    it("deep merges tts config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          tts: {
            provider: "elevenlabs",
            elevenlabs: { apiKey: "old-key", voiceId: "voice-1" },
          },
        })
      );

      await saveConfig({
        tts: {
          provider: "elevenlabs",
          elevenlabs: { apiKey: "new-key", voiceId: "voice-2" },
        },
      });

      const writtenConfig = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string
      );
      expect(writtenConfig.tts.provider).toBe("elevenlabs");
      expect(writtenConfig.tts.elevenlabs.apiKey).toBe("new-key");
    });

    it("deep merges preferences config", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          preferences: { max_words: 100, summary_prompt: "custom" },
        })
      );

      await saveConfig({
        preferences: { max_words: 75, summary_prompt: null, activate_editor: true },
      });

      const writtenConfig = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string
      ) as HeraldConfig;
      expect(writtenConfig.preferences.max_words).toBe(75);
      expect(writtenConfig.preferences.summary_prompt).toBeNull();
    });

    it("formats JSON with 2-space indentation", async () => {
      await saveConfig({ enabled: true });

      const writtenContent = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writtenContent).toContain("\n  "); // 2-space indent
    });
  });
});
