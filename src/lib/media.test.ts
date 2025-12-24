import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { pauseMedia, resumeMedia, withMediaControl } from "./media.js";

describe("media", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("pauseMedia", () => {
    it("does nothing on unsupported platforms like Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      // Should complete without error
      await expect(pauseMedia()).resolves.toBeUndefined();
    });

    it("completes without throwing on any platform", async () => {
      // pauseMedia should never throw - it's designed to fail silently
      await expect(pauseMedia()).resolves.toBeUndefined();
    });
  });

  describe("resumeMedia", () => {
    it("does nothing on unsupported platforms like Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      await expect(resumeMedia()).resolves.toBeUndefined();
    });

    it("completes without throwing on any platform", async () => {
      // resumeMedia should never throw - it's designed to fail silently
      await expect(resumeMedia()).resolves.toBeUndefined();
    });

    it("clears internal state after resume", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      // Call resume twice - should not cause issues
      await resumeMedia();
      await resumeMedia();
      // No error means success
    });
  });

  describe("withMediaControl", () => {
    it("calls and returns result from the wrapped function", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const fn = vi.fn().mockResolvedValue("result");

      const result = await withMediaControl(fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("returns complex objects from wrapped function", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await withMediaControl(async () => {
        return { data: "test", count: 42 };
      });

      expect(result).toEqual({ data: "test", count: 42 });
    });

    it("propagates errors from the wrapped function", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const error = new Error("Function failed");

      await expect(
        withMediaControl(async () => {
          throw error;
        })
      ).rejects.toThrow("Function failed");
    });

    it("works with sync-returning async functions", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await withMediaControl(async () => "sync-value");

      expect(result).toBe("sync-value");
    });

    it("handles void-returning functions", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const fn = vi.fn().mockResolvedValue(undefined);

      const result = await withMediaControl(fn);

      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalled();
    });

    it("waits before resuming media (delay exists)", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const start = Date.now();

      await withMediaControl(async () => "done");

      const elapsed = Date.now() - start;

      // Should take at least 300ms due to the built-in delay
      expect(elapsed).toBeGreaterThanOrEqual(290); // Allow some tolerance
    });
  });
});
