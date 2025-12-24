import { readFile, writeFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
const HISTORY_DIR = join(homedir(), ".config", "herald");
const HISTORY_FILE = join(HISTORY_DIR, "recent.json");
const HISTORY_LOCK_FILE = join(HISTORY_DIR, "recent.lock");
// How long to remember played content for deduplication
export const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
// Maximum number of entries to keep in history
export const MAX_HISTORY_SIZE = 10;
/**
 * Hash content for deduplication.
 * Uses SHA256 and returns first 16 characters.
 */
export function hashContent(text) {
    return createHash("sha256").update(text).digest("hex").slice(0, 16);
}
/**
 * Acquire a short-lived lock for history file operations.
 */
async function acquireHistoryLock(maxWaitMs = 1000) {
    await mkdir(HISTORY_DIR, { recursive: true });
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
        try {
            const handle = await open(HISTORY_LOCK_FILE, "wx");
            await handle.write(String(process.pid));
            await handle.close();
            return true;
        }
        catch (err) {
            if (err &&
                typeof err === "object" &&
                "code" in err &&
                err.code === "EEXIST") {
                await new Promise((resolve) => setTimeout(resolve, 10));
                continue;
            }
            return true; // Other error, fail open
        }
    }
    return true; // Timeout, fail open
}
/**
 * Release the history lock.
 */
async function releaseHistoryLock() {
    try {
        await unlink(HISTORY_LOCK_FILE);
    }
    catch {
        // Ignore errors
    }
}
/**
 * Read recent plays, filtering out expired entries and limiting to max size.
 */
async function readHistory() {
    try {
        if (!existsSync(HISTORY_FILE)) {
            return [];
        }
        const content = await readFile(HISTORY_FILE, "utf-8");
        const plays = JSON.parse(content);
        const now = Date.now();
        // Filter expired entries and keep only the most recent MAX_HISTORY_SIZE
        return plays
            .filter((p) => now - p.timestamp < DEDUP_WINDOW_MS)
            .slice(-MAX_HISTORY_SIZE);
    }
    catch {
        return [];
    }
}
/**
 * Write history to disk, keeping only the most recent entries.
 */
async function writeHistory(plays) {
    await mkdir(HISTORY_DIR, { recursive: true });
    // Keep only the most recent MAX_HISTORY_SIZE entries
    const trimmed = plays.slice(-MAX_HISTORY_SIZE);
    await writeFile(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}
/**
 * Check if content was recently played (duplicate).
 * Returns true if this is a duplicate that should be skipped.
 */
export async function isDuplicate(hash) {
    await acquireHistoryLock();
    try {
        const history = await readHistory();
        return history.some((p) => p.hash === hash);
    }
    finally {
        await releaseHistoryLock();
    }
}
/**
 * Record that content was played.
 * Call this after successfully playing a message.
 */
export async function recordPlay(hash) {
    await acquireHistoryLock();
    try {
        const history = await readHistory();
        // Don't add duplicate entries
        if (!history.some((p) => p.hash === hash)) {
            history.push({ hash, timestamp: Date.now() });
            await writeHistory(history);
        }
    }
    finally {
        await releaseHistoryLock();
    }
}
/**
 * Check if duplicate and record in one atomic operation.
 * Returns true if this is a NEW message (should be played).
 * Returns false if this is a DUPLICATE (should be skipped).
 */
export async function checkAndRecord(hash) {
    await acquireHistoryLock();
    try {
        const history = await readHistory();
        // Check for duplicate
        if (history.some((p) => p.hash === hash)) {
            return false; // Duplicate
        }
        // Record this play
        history.push({ hash, timestamp: Date.now() });
        await writeHistory(history);
        return true; // New message
    }
    finally {
        await releaseHistoryLock();
    }
}
/**
 * Clear all history (for testing).
 */
export async function clearHistory() {
    await acquireHistoryLock();
    try {
        await writeHistory([]);
    }
    finally {
        await releaseHistoryLock();
    }
}
export { HISTORY_FILE, HISTORY_DIR, HISTORY_LOCK_FILE };
