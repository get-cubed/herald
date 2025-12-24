import { describe, it, expect, afterEach } from "vitest";
import {
  getDefaultProvider,
  getAvailableProviders,
  getProvider,
} from "./index.js";
import type { TTSProviderConfig } from "../types.js";

describe("tts/index", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("built-in provider registration", () => {
    it("registers macos provider", () => {
      expect(getAvailableProviders()).toContain("macos");
    });

    it("registers windows provider", () => {
      expect(getAvailableProviders()).toContain("windows");
    });

    it("registers elevenlabs provider", () => {
      expect(getAvailableProviders()).toContain("elevenlabs");
    });

    it("macos provider can be retrieved", () => {
      const config: TTSProviderConfig = { provider: "macos" };
      const provider = getProvider(config);

      expect(provider.name).toBe("macOS Say");
    });

    it("windows provider can be retrieved", () => {
      const config: TTSProviderConfig = { provider: "windows" };
      const provider = getProvider(config);

      expect(provider.name).toBe("Windows SAPI");
    });

    it("elevenlabs provider requires config", () => {
      const config: TTSProviderConfig = {
        provider: "elevenlabs",
        elevenlabs: { apiKey: "test-key", voiceId: "test-voice" },
      };
      const provider = getProvider(config);

      expect(provider.name).toBe("ElevenLabs");
    });
  });

  describe("getDefaultProvider", () => {
    it("returns 'windows' on Windows platform", () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      expect(getDefaultProvider()).toBe("windows");
    });

    it("returns 'macos' on macOS platform", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      expect(getDefaultProvider()).toBe("macos");
    });

    it("returns 'macos' as fallback on Linux", () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      expect(getDefaultProvider()).toBe("macos");
    });

    it("returns 'macos' for unknown platforms", () => {
      Object.defineProperty(process, "platform", { value: "freebsd" });

      expect(getDefaultProvider()).toBe("macos");
    });
  });
});
