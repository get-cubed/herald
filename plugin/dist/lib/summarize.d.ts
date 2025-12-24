export declare function cleanForSpeech(text: string): string;
/**
 * Count words in text efficiently without creating full array.
 */
export declare function countWords(text: string): number;
export declare function truncateToWords(text: string, maxWords: number): string;
export declare function summarizeWithClaude(text: string, maxWords: number, customPrompt?: string | null): Promise<string | null>;
