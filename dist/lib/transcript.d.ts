/**
 * Parse JSONL transcript and extract text from the last assistant message.
 * @param transcriptPath - Path to the JSONL transcript file
 * @returns The text content of the last assistant message, or "Done" if not found
 */
export declare function extractLastAssistantMessage(transcriptPath: string): Promise<string>;
/**
 * Parse JSONL text and extract text from the last assistant message.
 * Pure function for easier testing.
 * @param text - JSONL transcript content
 * @returns The text content of the last assistant message, or "Done" if not found
 */
export declare function extractLastAssistantMessageFromText(text: string): string;
