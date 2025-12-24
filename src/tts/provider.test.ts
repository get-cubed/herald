import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProvider,
  getProvider,
  getAvailableProviders,
  type ITTSProvider,
  type ProviderFactory,
} from "./provider.js";
import type { TTSProviderConfig } from "../types.js";

// Create a fresh provider registry for each test by re-importing
// Since the providers Map is module-scoped, we need to work around it

describe("provider", () => {
  describe("ITTSProvider interface", () => {
    it("defines required methods", () => {
      const mockProvider: ITTSProvider = {
        name: "test-provider",
        speak: async () => {},
        isAvailable: async () => true,
      };

      expect(mockProvider.name).toBe("test-provider");
      expect(typeof mockProvider.speak).toBe("function");
      expect(typeof mockProvider.isAvailable).toBe("function");
    });
  });

  describe("registerProvider", () => {
    it("registers a provider factory", () => {
      const factory: ProviderFactory = () => ({
        name: "custom",
        speak: async () => {},
        isAvailable: async () => true,
      });

      registerProvider("custom", factory);

      expect(getAvailableProviders()).toContain("custom");
    });

    it("overwrites existing provider with same name", () => {
      const factory1: ProviderFactory = () => ({
        name: "overwrite-test",
        speak: async () => {},
        isAvailable: async () => true,
      });

      const factory2: ProviderFactory = () => ({
        name: "overwrite-test-v2",
        speak: async () => {},
        isAvailable: async () => false,
      });

      registerProvider("overwrite", factory1);
      registerProvider("overwrite", factory2);

      const config: TTSProviderConfig = { provider: "overwrite" as never };
      const provider = getProvider(config);
      expect(provider.name).toBe("overwrite-test-v2");
    });
  });

  describe("getProvider", () => {
    beforeEach(() => {
      // Register a test provider for these tests
      registerProvider("test-get", () => ({
        name: "test-get-provider",
        speak: async () => {},
        isAvailable: async () => true,
      }));
    });

    it("returns provider from registered factory", () => {
      const config: TTSProviderConfig = { provider: "test-get" as never };
      const provider = getProvider(config);

      expect(provider.name).toBe("test-get-provider");
    });

    it("passes config to factory", () => {
      let receivedConfig: TTSProviderConfig | undefined;

      registerProvider("config-test", (config) => {
        receivedConfig = config;
        return {
          name: "config-aware",
          speak: async () => {},
          isAvailable: async () => true,
        };
      });

      const config: TTSProviderConfig = {
        provider: "config-test" as never,
        elevenlabs: { apiKey: "test-key", voiceId: "voice-123" },
      };

      getProvider(config);

      expect(receivedConfig).toEqual(config);
    });

    it("throws for unknown provider", () => {
      const config: TTSProviderConfig = { provider: "nonexistent" as never };

      expect(() => getProvider(config)).toThrow(
        "Unknown TTS provider: nonexistent"
      );
    });

    it("creates new instance on each call", () => {
      let callCount = 0;
      registerProvider("instance-test", () => {
        callCount++;
        return {
          name: `instance-${callCount}`,
          speak: async () => {},
          isAvailable: async () => true,
        };
      });

      const config: TTSProviderConfig = { provider: "instance-test" as never };

      const p1 = getProvider(config);
      const p2 = getProvider(config);

      expect(p1.name).toBe("instance-1");
      expect(p2.name).toBe("instance-2");
    });
  });

  describe("getAvailableProviders", () => {
    it("returns array of registered provider names", () => {
      registerProvider("avail-test-1", () => ({
        name: "test1",
        speak: async () => {},
        isAvailable: async () => true,
      }));

      registerProvider("avail-test-2", () => ({
        name: "test2",
        speak: async () => {},
        isAvailable: async () => true,
      }));

      const providers = getAvailableProviders();

      expect(providers).toContain("avail-test-1");
      expect(providers).toContain("avail-test-2");
    });

    it("returns empty-like array when no providers registered", () => {
      // Can't fully test this because of module-level state
      // but we can verify it returns an array
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe("provider integration scenarios", () => {
    it("supports async speak operations", async () => {
      let spoken = "";

      registerProvider("async-test", () => ({
        name: "async-provider",
        speak: async (message) => {
          spoken = message;
          await new Promise((r) => setTimeout(r, 1));
        },
        isAvailable: async () => true,
      }));

      const config: TTSProviderConfig = { provider: "async-test" as never };
      const provider = getProvider(config);

      await provider.speak("Hello world");

      expect(spoken).toBe("Hello world");
    });

    it("supports isAvailable check", async () => {
      registerProvider("availability-test", () => ({
        name: "conditional-provider",
        speak: async () => {},
        isAvailable: async () => {
          return process.platform === "darwin";
        },
      }));

      const config: TTSProviderConfig = {
        provider: "availability-test" as never,
      };
      const provider = getProvider(config);

      const available = await provider.isAvailable();
      expect(typeof available).toBe("boolean");
    });

    it("supports providers with config-dependent behavior", async () => {
      registerProvider("elevenlabs-mock", (config) => ({
        name: "elevenlabs",
        speak: async () => {
          if (!config.elevenlabs?.apiKey) {
            throw new Error("API key required");
          }
        },
        isAvailable: async () => !!config.elevenlabs?.apiKey,
      }));

      const configWithKey: TTSProviderConfig = {
        provider: "elevenlabs-mock" as never,
        elevenlabs: { apiKey: "key", voiceId: "voice" },
      };

      const configWithoutKey: TTSProviderConfig = {
        provider: "elevenlabs-mock" as never,
      };

      const providerWithKey = getProvider(configWithKey);
      const providerWithoutKey = getProvider(configWithoutKey);

      await expect(providerWithKey.isAvailable()).resolves.toBe(true);
      await expect(providerWithoutKey.isAvailable()).resolves.toBe(false);
    });
  });
});
