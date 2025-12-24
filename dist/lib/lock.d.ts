declare const LOCK_DIR: string;
declare const PLAYER_LOCK_FILE: string;
export declare const PLAYER_LOCK_EXPIRY_MS: number;
/**
 * Attempt to acquire the player lock.
 * Only one process can hold this lock at a time.
 * Uses atomic file creation and PID-based stale detection.
 * @returns true if lock was acquired, false if another process holds the lock
 */
export declare function acquirePlayerLock(): Promise<boolean>;
/**
 * Release the player lock.
 * Safe to call even if lock doesn't exist.
 */
export declare function releasePlayerLock(): Promise<void>;
export declare const WAIT_FOR_LOCK_TIMEOUT_MS: number;
/**
 * Wait for the player lock to become available, then acquire it.
 * Polls periodically until lock is acquired or timeout is reached.
 * @param timeoutMs - Maximum time to wait (default 5 minutes)
 * @returns true if lock was acquired, false if timed out
 */
export declare function waitForPlayerLock(timeoutMs?: number): Promise<boolean>;
export { PLAYER_LOCK_FILE, LOCK_DIR };
