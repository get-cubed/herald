import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { pauseMedia, resumeMedia, withMediaControl } from "./media.js";

describe("media", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    // Run all tests on Linux (no-op path) to avoid slow osascript/powershell calls
    Object.defineProperty(process, "platform", { value: "linux" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("pauseMedia", () => {
    it("completes without error on unsupported platforms", async () => {
      await expect(pauseMedia()).resolves.toBeUndefined();
    });
  });

  describe("resumeMedia", () => {
    it("completes without error on unsupported platforms", async () => {
      await expect(resumeMedia()).resolves.toBeUndefined();
    });

    it("can be called multiple times safely", async () => {
      await resumeMedia();
      await resumeMedia();
      // No error means success
    });
  });

  describe("withMediaControl", () => {
    it("calls the wrapped function and returns its result", async () => {
      const fn = vi.fn().mockResolvedValue("result");

      const result = await withMediaControl(fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("returns complex objects from wrapped function", async () => {
      const result = await withMediaControl(async () => {
        return { data: "test", count: 42 };
      });

      expect(result).toEqual({ data: "test", count: 42 });
    });

    it("propagates errors from the wrapped function", async () => {
      await expect(
        withMediaControl(async () => {
          throw new Error("TTS failed");
        })
      ).rejects.toThrow("TTS failed");
    });

    it("waits 300ms before resuming media", async () => {
      const start = Date.now();

      await withMediaControl(async () => "done");

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(290); // Allow tolerance
    });

    it("still waits and resumes even when wrapped function throws", async () => {
      const start = Date.now();

      await expect(
        withMediaControl(async () => {
          throw new Error("Failed");
        })
      ).rejects.toThrow("Failed");

      const elapsed = Date.now() - start;
      // Delay still happened (finally block executed)
      expect(elapsed).toBeGreaterThanOrEqual(290);
    });

    it("handles void-returning functions", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);

      const result = await withMediaControl(fn);

      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalled();
    });
  });
});
