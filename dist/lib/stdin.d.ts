/**
 * Read all data from stdin with a timeout to prevent hanging.
 */
export declare function readStdin(timeoutMs?: number): Promise<string>;
