import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before imports
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
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
  isDuplicate,
  recordPlay,
  checkAndRecord,
  clearHistory,
  hashContent,
  DEDUP_WINDOW_MS,
  MAX_HISTORY_SIZE,
  HISTORY_FILE,
  HISTORY_DIR,
  HISTORY_LOCK_FILE,
} from "./recent.js";
import { readFile, writeFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";

describe("recent plays tracker", () => {
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
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("constants", () => {
    it("exports correct dedup window (5 minutes)", () => {
      expect(DEDUP_WINDOW_MS).toBe(5 * 60 * 1000);
    });

    it("exports correct max history size (10)", () => {
      expect(MAX_HISTORY_SIZE).toBe(10);
    });

    it("exports correct history file path", () => {
      expect(HISTORY_FILE).toBe("/mock/home/.config/herald/recent.json");
    });

    it("exports correct history directory", () => {
      expect(HISTORY_DIR).toBe("/mock/home/.config/herald");
    });

    it("exports correct history lock file path", () => {
      expect(HISTORY_LOCK_FILE).toBe("/mock/home/.config/herald/recent.lock");
    });
  });

  describe("hashContent", () => {
    it("returns a 16-character hex string", () => {
      const hash = hashContent("test content");
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("returns same hash for same content", () => {
      const hash1 = hashContent("same content");
      const hash2 = hashContent("same content");
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different content", () => {
      const hash1 = hashContent("content 1");
      const hash2 = hashContent("content 2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("isDuplicate", () => {
    it("returns false when history is empty", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await isDuplicate("abc123");
      expect(result).toBe(false);
    });

    it("returns true when hash exists in history", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify([{ hash: "abc123", timestamp: Date.now() - 1000 }])
      );

      const result = await isDuplicate("abc123");
      expect(result).toBe(true);
    });

    it("returns false when hash does not exist", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify([{ hash: "different", timestamp: Date.now() - 1000 }])
      );

      const result = await isDuplicate("abc123");
      expect(result).toBe(false);
    });

    it("returns false for expired entries", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });
      // Entry expired 1 second ago
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify([
          { hash: "abc123", timestamp: Date.now() - DEDUP_WINDOW_MS - 1000 },
        ])
      );

      const result = await isDuplicate("abc123");
      expect(result).toBe(false);
    });
  });

  describe("recordPlay", () => {
    it("creates history directory", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await recordPlay("abc123");

      expect(mkdir).toHaveBeenCalledWith(HISTORY_DIR, { recursive: true });
    });

    it("writes hash with timestamp to history", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const now = Date.now();

      await recordPlay("abc123");

      expect(writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toHaveLength(1);
      expect(written[0]).toMatchObject({
        hash: "abc123",
        timestamp: now,
      });
    });

    it("appends to existing history", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify([{ hash: "existing", timestamp: Date.now() - 1000 }])
      );

      await recordPlay("newhash");

      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toHaveLength(2);
      expect(written[1].hash).toBe("newhash");
    });

    it("does not add duplicate entry", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify([{ hash: "abc123", timestamp: Date.now() - 1000 }])
      );

      await recordPlay("abc123");

      // writeFile should NOT be called since entry already exists
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe("checkAndRecord", () => {
    describe("when hash is new", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockReturnValue(false);
      });

      it("returns true", async () => {
        const result = await checkAndRecord("abc123");
        expect(result).toBe(true);
      });

      it("records the hash", async () => {
        await checkAndRecord("abc123");

        expect(writeFile).toHaveBeenCalled();
        const writeCall = vi.mocked(writeFile).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);
        expect(written[0].hash).toBe("abc123");
      });
    });

    describe("when hash is duplicate", () => {
      beforeEach(() => {
        vi.mocked(existsSync).mockImplementation((path) => {
          if (path === HISTORY_FILE) return true;
          return false;
        });
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify([{ hash: "abc123", timestamp: Date.now() - 1000 }])
        );
      });

      it("returns false", async () => {
        const result = await checkAndRecord("abc123");
        expect(result).toBe(false);
      });

      it("does not write to history", async () => {
        await checkAndRecord("abc123");

        expect(writeFile).not.toHaveBeenCalled();
      });
    });

    describe("expired entry cleanup", () => {
      it("filters out expired entries and allows reuse of hash", async () => {
        vi.mocked(existsSync).mockImplementation((path) => {
          if (path === HISTORY_FILE) return true;
          return false;
        });
        // Entry expired
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify([
            { hash: "abc123", timestamp: Date.now() - DEDUP_WINDOW_MS - 1000 },
          ])
        );

        const result = await checkAndRecord("abc123");

        expect(result).toBe(true); // Should be treated as new
      });
    });
  });

  describe("clearHistory", () => {
    it("writes empty array to history file", async () => {
      await clearHistory();

      expect(writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toEqual([]);
    });
  });

  describe("history size limit", () => {
    it("trims history to MAX_HISTORY_SIZE when writing", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });

      // Create 15 entries (more than MAX_HISTORY_SIZE of 10)
      const entries = Array.from({ length: 15 }, (_, i) => ({
        hash: `hash${i}`,
        timestamp: Date.now() - (15 - i) * 1000, // Oldest first
      }));
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(entries));

      await checkAndRecord("newhash");

      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);

      // Should have at most MAX_HISTORY_SIZE entries
      expect(written.length).toBeLessThanOrEqual(MAX_HISTORY_SIZE);
      // Should include the new hash
      expect(written.some((e: { hash: string }) => e.hash === "newhash")).toBe(
        true
      );
      // Should keep the most recent entries (higher indices from original)
      expect(written.some((e: { hash: string }) => e.hash === "hash0")).toBe(
        false
      ); // Oldest dropped
    });

    it("keeps most recent entries when reading oversized history", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === HISTORY_FILE) return true;
        return false;
      });

      // Create 15 entries with the target hash being old
      const entries = [
        { hash: "oldtarget", timestamp: Date.now() - 1000 }, // This is old but within window
        ...Array.from({ length: 14 }, (_, i) => ({
          hash: `hash${i}`,
          timestamp: Date.now() - (14 - i) * 100,
        })),
      ];
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(entries));

      // The old entry should be trimmed out (only last 10 kept)
      const result = await isDuplicate("oldtarget");
      expect(result).toBe(false); // Trimmed out
    });
  });

  describe("history lock handling", () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(false);
    });

    it("acquires and releases history lock during checkAndRecord", async () => {
      await checkAndRecord("test");

      expect(open).toHaveBeenCalledWith(HISTORY_LOCK_FILE, "wx");
      expect(unlink).toHaveBeenCalledWith(HISTORY_LOCK_FILE);
    });

    it("handles non-EEXIST lock errors gracefully", async () => {
      vi.mocked(open).mockRejectedValue(new Error("Permission denied"));

      const result = await checkAndRecord("test");

      // Should fail closed (skip notification to be safe)
      expect(result).toBe(false);
    });
  });
});
