import { readFile, mkdir, open, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const LOCK_DIR = join(homedir(), ".config", "herald");
const LOCK_FILE = join(LOCK_DIR, "tts.lock");

export const TTS_LOCK_EXPIRY_MS = 30000; // 30 seconds
export const ALERT_LOCK_EXPIRY_MS = 2000; // 2 seconds

/**
 * Attempt to acquire a global lock to prevent duplicate plays.
 * Uses atomic file creation and timestamp-based expiry.
 * @param expiryMs - Lock expiry time in milliseconds
 * @returns true if lock was acquired, false if another process holds the lock
 */
export async function acquireGlobalLock(expiryMs: number): Promise<boolean> {
  try {
    await mkdir(LOCK_DIR, { recursive: true });

    // Check if lock exists and is stale (expired)
    if (existsSync(LOCK_FILE)) {
      try {
        const content = await readFile(LOCK_FILE, "utf-8");
        const timestamp = parseInt(content, 10);
        if (Date.now() - timestamp < expiryMs) {
          return false; // Lock is held and not expired
        }
        // Lock is stale, remove it
        await unlink(LOCK_FILE);
      } catch {
        // Ignore errors reading stale lock
      }
    }

    // Atomic lock acquisition using exclusive create (wx flag)
    // This fails if file already exists, preventing race conditions
    const handle = await open(LOCK_FILE, "wx");
    await handle.write(String(Date.now()));
    await handle.close();
    return true;
  } catch (err) {
    // EEXIST means another process created the lock between our check and create
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "EEXIST"
    ) {
      return false;
    }
    return true; // Other errors, fail open
  }
}

/**
 * Release the global lock.
 * Safe to call even if lock doesn't exist.
 */
export async function releaseGlobalLock(): Promise<void> {
  try {
    await unlink(LOCK_FILE);
  } catch {
    // Ignore errors
  }
}

export { LOCK_FILE, LOCK_DIR };
