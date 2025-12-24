/**
 * Pause all playing media and store state for later resume.
 */
export declare function pauseMedia(): Promise<void>;
/**
 * Resume media that was previously paused.
 */
export declare function resumeMedia(): Promise<void>;
/**
 * Wrap a TTS function with automatic media pause/resume.
 */
export declare function withMediaControl<T>(ttsFn: () => Promise<T>): Promise<T>;
