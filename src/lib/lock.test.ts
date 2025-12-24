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
  acquireGlobalLock,
  releaseGlobalLock,
  TTS_LOCK_EXPIRY_MS,
  ALERT_LOCK_EXPIRY_MS,
  LOCK_FILE,
  LOCK_DIR,
} from "./lock.js";
import { readFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";

describe("lock", () => {
  const mockFileHandle = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(open).mockResolvedValue(mockFileHandle as never);
    vi.mocked(unlink).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("constants", () => {
    it("exports correct TTS lock expiry", () => {
      expect(TTS_LOCK_EXPIRY_MS).toBe(30000);
    });

    it("exports correct alert lock expiry", () => {
      expect(ALERT_LOCK_EXPIRY_MS).toBe(2000);
    });

    it("exports correct lock file path", () => {
      expect(LOCK_FILE).toBe("/mock/home/.config/herald/tts.lock");
    });

    it("exports correct lock directory", () => {
      expect(LOCK_DIR).toBe("/mock/home/.config/herald");
    });
  });

  describe("acquireGlobalLock", () => {
    describe("when no lock exists", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(false);
      });

      it("creates lock directory", async () => {
        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(mkdir).toHaveBeenCalledWith(LOCK_DIR, { recursive: true });
      });

      it("creates lock file with current timestamp", async () => {
        const now = Date.now();

        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(open).toHaveBeenCalledWith(LOCK_FILE, "wx");
        expect(mockFileHandle.write).toHaveBeenCalledWith(String(now));
        expect(mockFileHandle.close).toHaveBeenCalled();
      });

      it("returns true indicating lock acquired", async () => {
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });
    });

    describe("when lock exists and is not expired", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 10 seconds ago (within 30 second expiry)
        const lockTimestamp = Date.now() - 10000;
        vi.mocked(readFile).mockResolvedValue(String(lockTimestamp));
      });

      it("returns false indicating lock not acquired", async () => {
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(false);
      });

      it("does not try to remove lock", async () => {
        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(unlink).not.toHaveBeenCalled();
      });

      it("does not try to create new lock", async () => {
        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(open).not.toHaveBeenCalled();
      });
    });

    describe("when lock exists but is expired", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 60 seconds ago (beyond 30 second expiry)
        const lockTimestamp = Date.now() - 60000;
        vi.mocked(readFile).mockResolvedValue(String(lockTimestamp));
      });

      it("removes stale lock", async () => {
        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(unlink).toHaveBeenCalledWith(LOCK_FILE);
      });

      it("creates new lock file", async () => {
        await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(open).toHaveBeenCalledWith(LOCK_FILE, "wx");
      });

      it("returns true indicating lock acquired", async () => {
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });
    });

    describe("when lock at expiry boundary (edge case)", () => {
      it("treats lock as expired at exactly expiry boundary", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created exactly 30 seconds ago (at expiry boundary)
        // The check is `<` not `<=`, so exactly at expiry is expired
        const lockTimestamp = Date.now() - TTS_LOCK_EXPIRY_MS;
        vi.mocked(readFile).mockResolvedValue(String(lockTimestamp));

        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });

      it("holds lock 1ms before expiry", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        // Lock created 29999ms ago (just before expiry)
        const lockTimestamp = Date.now() - TTS_LOCK_EXPIRY_MS + 1;
        vi.mocked(readFile).mockResolvedValue(String(lockTimestamp));

        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(false);
      });
    });

    describe("race condition handling", () => {
      it("returns false when another process creates lock first", async () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const eexistError = new Error("File exists") as NodeJS.ErrnoException;
        eexistError.code = "EEXIST";
        vi.mocked(open).mockRejectedValue(eexistError);

        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(false);
      });
    });

    describe("error handling", () => {
      it("returns true on mkdir failure (fail open)", async () => {
        vi.mocked(mkdir).mockRejectedValue(new Error("Permission denied"));

        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });

      it("handles invalid timestamp in lock file", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue("not a number");

        // NaN comparison should treat as expired
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });

      it("handles lock file read error gracefully", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockRejectedValue(new Error("Read error"));

        // Should proceed to create new lock
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });

      it("handles unlink error gracefully", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue(String(Date.now() - 60000));
        vi.mocked(unlink).mockRejectedValue(new Error("Unlink failed"));

        // Should still try to create lock
        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(open).toHaveBeenCalled();
      });

      it("returns true for non-EEXIST errors (fail open)", async () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(open).mockRejectedValue(new Error("Disk full"));

        const result = await acquireGlobalLock(TTS_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });
    });

    describe("with different expiry times", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(true);
      });

      it("respects short alert expiry", async () => {
        // Lock created 3 seconds ago (beyond 2 second alert expiry)
        vi.mocked(readFile).mockResolvedValue(String(Date.now() - 3000));

        const result = await acquireGlobalLock(ALERT_LOCK_EXPIRY_MS);

        expect(result).toBe(true);
      });

      it("blocks with short alert expiry when lock is fresh", async () => {
        // Lock created 1 second ago (within 2 second alert expiry)
        vi.mocked(readFile).mockResolvedValue(String(Date.now() - 1000));

        const result = await acquireGlobalLock(ALERT_LOCK_EXPIRY_MS);

        expect(result).toBe(false);
      });
    });
  });

  describe("releaseGlobalLock", () => {
    it("unlinks the lock file", async () => {
      await releaseGlobalLock();

      expect(unlink).toHaveBeenCalledWith(LOCK_FILE);
    });

    it("does not throw when file does not exist", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("ENOENT"));

      await expect(releaseGlobalLock()).resolves.toBeUndefined();
    });

    it("does not throw on other errors", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("Permission denied"));

      await expect(releaseGlobalLock()).resolves.toBeUndefined();
    });
  });
});
