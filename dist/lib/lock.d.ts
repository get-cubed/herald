declare const LOCK_DIR: string;
declare const LOCK_FILE: string;
export declare const TTS_LOCK_EXPIRY_MS = 30000;
export declare const ALERT_LOCK_EXPIRY_MS = 2000;
/**
 * Attempt to acquire a global lock to prevent duplicate plays.
 * Uses atomic file creation and timestamp-based expiry.
 * @param expiryMs - Lock expiry time in milliseconds
 * @returns true if lock was acquired, false if another process holds the lock
 */
export declare function acquireGlobalLock(expiryMs: number): Promise<boolean>;
/**
 * Release the global lock.
 * Safe to call even if lock doesn't exist.
 */
export declare function releaseGlobalLock(): Promise<void>;
export { LOCK_FILE, LOCK_DIR };
