import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before imports
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  open: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/mock/home"),
}));

import {
  acquirePlayerLock,
  releasePlayerLock,
  waitForPlayerLock,
  PLAYER_LOCK_EXPIRY_MS,
  WAIT_FOR_LOCK_TIMEOUT_MS,
  PLAYER_LOCK_FILE,
  LOCK_DIR,
} from "./lock.js";
import { readFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";

describe("lock", () => {
  const mockFileHandle = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  // Mock process.kill for PID checking
  const originalKill = process.kill;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(open).mockResolvedValue(mockFileHandle as never);
    vi.mocked(unlink).mockResolvedValue(undefined);
    // Default: process.kill returns true (process exists)
    process.kill = vi.fn(() => true) as never;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.kill = originalKill;
  });

  describe("constants", () => {
    it("exports correct player lock expiry (5 minutes)", () => {
      expect(PLAYER_LOCK_EXPIRY_MS).toBe(5 * 60 * 1000);
    });

    it("exports correct player lock file path", () => {
      expect(PLAYER_LOCK_FILE).toBe("/mock/home/.config/herald/player.lock");
    });

    it("exports correct lock directory", () => {
      expect(LOCK_DIR).toBe("/mock/home/.config/herald");
    });
  });

  describe("acquirePlayerLock", () => {
    describe("when no lock exists", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(false);
      });

      it("creates lock directory", async () => {
        await acquirePlayerLock();

        expect(mkdir).toHaveBeenCalledWith(LOCK_DIR, { recursive: true });
      });

      it("creates lock file with timestamp and PID", async () => {
        const now = Date.now();

        await acquirePlayerLock();

        expect(open).toHaveBeenCalledWith(PLAYER_LOCK_FILE, "wx");
        expect(mockFileHandle.write).toHaveBeenCalledWith(`${now}:${process.pid}`);
        expect(mockFileHandle.close).toHaveBeenCalled();
      });

      it("returns true indicating lock acquired", async () => {
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });
    });

    describe("when lock exists and is not expired (active process)", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 10 seconds ago with PID 12345
        const lockTimestamp = Date.now() - 10000;
        vi.mocked(readFile).mockResolvedValue(`${lockTimestamp}:12345`);
        // Process 12345 is still running
        process.kill = vi.fn(() => true) as never;
      });

      it("returns false indicating lock not acquired", async () => {
        const result = await acquirePlayerLock();

        expect(result).toBe(false);
      });

      it("checks if process is still running", async () => {
        await acquirePlayerLock();

        expect(process.kill).toHaveBeenCalledWith(12345, 0);
      });

      it("does not try to remove lock", async () => {
        await acquirePlayerLock();

        expect(unlink).not.toHaveBeenCalled();
      });

      it("does not try to create new lock", async () => {
        await acquirePlayerLock();

        expect(open).not.toHaveBeenCalled();
      });
    });

    describe("when lock exists but process is dead", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 10 seconds ago (not expired by time)
        const lockTimestamp = Date.now() - 10000;
        vi.mocked(readFile).mockResolvedValue(`${lockTimestamp}:12345`);
        // Process 12345 is NOT running
        process.kill = vi.fn(() => {
          throw new Error("ESRCH");
        }) as never;
      });

      it("detects stale lock via PID check", async () => {
        await acquirePlayerLock();

        expect(process.kill).toHaveBeenCalledWith(12345, 0);
      });

      it("removes stale lock", async () => {
        await acquirePlayerLock();

        expect(unlink).toHaveBeenCalledWith(PLAYER_LOCK_FILE);
      });

      it("creates new lock file", async () => {
        await acquirePlayerLock();

        expect(open).toHaveBeenCalledWith(PLAYER_LOCK_FILE, "wx");
      });

      it("returns true indicating lock acquired", async () => {
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });
    });

    describe("when lock exists and is expired by time", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 6 minutes ago (beyond 5 minute expiry)
        const lockTimestamp = Date.now() - 6 * 60 * 1000;
        vi.mocked(readFile).mockResolvedValue(`${lockTimestamp}:12345`);
      });

      it("removes stale lock", async () => {
        await acquirePlayerLock();

        expect(unlink).toHaveBeenCalledWith(PLAYER_LOCK_FILE);
      });

      it("creates new lock file", async () => {
        await acquirePlayerLock();

        expect(open).toHaveBeenCalledWith(PLAYER_LOCK_FILE, "wx");
      });

      it("returns true indicating lock acquired", async () => {
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });
    });

    describe("when lock at expiry boundary (edge case)", () => {
      it("treats lock as expired at exactly expiry boundary", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created exactly 5 minutes ago (at expiry boundary)
        // The check is >= so exactly at expiry is expired
        const lockTimestamp = Date.now() - PLAYER_LOCK_EXPIRY_MS;
        vi.mocked(readFile).mockResolvedValue(`${lockTimestamp}:12345`);

        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });

      it("holds lock 1ms before expiry if process is running", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created just before expiry
        const lockTimestamp = Date.now() - PLAYER_LOCK_EXPIRY_MS + 1;
        vi.mocked(readFile).mockResolvedValue(`${lockTimestamp}:12345`);
        process.kill = vi.fn(() => true) as never;

        const result = await acquirePlayerLock();

        expect(result).toBe(false);
      });
    });

    describe("race condition handling", () => {
      it("returns false when another process creates lock first", async () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const eexistError = new Error("File exists") as NodeJS.ErrnoException;
        eexistError.code = "EEXIST";
        vi.mocked(open).mockRejectedValue(eexistError);

        const result = await acquirePlayerLock();

        expect(result).toBe(false);
      });
    });

    describe("error handling", () => {
      it("returns true on mkdir failure (fail open)", async () => {
        vi.mocked(mkdir).mockRejectedValue(new Error("Permission denied"));

        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });

      it("handles invalid lock file format", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue("invalid format");

        // Invalid format should be treated as stale
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });

      it("handles lock file with only timestamp (no PID)", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue(String(Date.now()));

        // Missing PID should be treated as stale
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });

      it("handles lock file read error gracefully", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockRejectedValue(new Error("Read error"));

        // Should proceed to create new lock
        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });

      it("handles unlink error gracefully", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue(`${Date.now() - 6 * 60 * 1000}:12345`);
        vi.mocked(unlink).mockRejectedValue(new Error("Unlink failed"));

        // Should still try to create lock
        const result = await acquirePlayerLock();

        expect(open).toHaveBeenCalled();
      });

      it("returns true for non-EEXIST errors (fail open)", async () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(open).mockRejectedValue(new Error("Disk full"));

        const result = await acquirePlayerLock();

        expect(result).toBe(true);
      });
    });
  });

  describe("releasePlayerLock", () => {
    it("unlinks the lock file", async () => {
      await releasePlayerLock();

      expect(unlink).toHaveBeenCalledWith(PLAYER_LOCK_FILE);
    });

    it("does not throw when file does not exist", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("ENOENT"));

      await expect(releasePlayerLock()).resolves.toBeUndefined();
    });

    it("does not throw on other errors", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("Permission denied"));

      await expect(releasePlayerLock()).resolves.toBeUndefined();
    });
  });

  describe("waitForPlayerLock", () => {
    it("exports correct wait timeout (5 minutes)", () => {
      expect(WAIT_FOR_LOCK_TIMEOUT_MS).toBe(5 * 60 * 1000);
    });

    it("returns true immediately when lock is available", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await waitForPlayerLock();

      expect(result).toBe(true);
      expect(open).toHaveBeenCalledWith(PLAYER_LOCK_FILE, "wx");
    });

    it("waits and retries when lock is held then released", async () => {
      let callCount = 0;
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(open).mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error("EEXIST") as NodeJS.ErrnoException;
          error.code = "EEXIST";
          throw error;
        }
        return mockFileHandle as never;
      });

      // Use real timers for this test but with a short timeout
      vi.useRealTimers();
      const result = await waitForPlayerLock(1000);

      expect(result).toBe(true);
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it("returns false when timeout is exceeded", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const eexistError = new Error("EEXIST") as NodeJS.ErrnoException;
      eexistError.code = "EEXIST";
      vi.mocked(open).mockRejectedValue(eexistError);

      // Use real timers with a very short timeout
      vi.useRealTimers();
      const result = await waitForPlayerLock(200);

      expect(result).toBe(false);
    });
  });
});
