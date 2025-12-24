declare const HISTORY_DIR: string;
declare const HISTORY_FILE: string;
declare const HISTORY_LOCK_FILE: string;
export declare const DEDUP_WINDOW_MS: number;
export declare const MAX_HISTORY_SIZE = 10;
/**
 * Hash content for deduplication.
 * Uses SHA256 and returns first 16 characters.
 */
export declare function hashContent(text: string): string;
/**
 * Check if content was recently played (duplicate).
 * Returns true if this is a duplicate that should be skipped.
 */
export declare function isDuplicate(hash: string): Promise<boolean>;
/**
 * Record that content was played.
 * Call this after successfully playing a message.
 */
export declare function recordPlay(hash: string): Promise<void>;
/**
 * Check if duplicate and record in one atomic operation.
 * Returns true if this is a NEW message (should be played).
 * Returns false if this is a DUPLICATE (should be skipped).
 */
export declare function checkAndRecord(hash: string): Promise<boolean>;
/**
 * Clear all history (for testing).
 */
export declare function clearHistory(): Promise<void>;
export { HISTORY_FILE, HISTORY_DIR, HISTORY_LOCK_FILE };
