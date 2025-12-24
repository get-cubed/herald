import { spawn } from "child_process";
import { DEFAULT_TTS_PROMPT } from "../types.js";
// Pre-compiled regex patterns for better performance
const CLEAN_PATTERNS = [
    [/```[\s\S]*?```/g, " (code block) "], // Code blocks
    [/`[^`]+`/g, ""], // Inline code
    [/^#{1,6}\s+/gm, ""], // Markdown headers
    [/\*{1,2}([^*]+)\*{1,2}/g, "$1"], // Bold/italic
    [/\[([^\]]+)\]\([^)]+\)/g, "$1"], // Links (keep text)
    [/^[\s]*(?:[-*]|\d+\.)\s+/gm, ""], // Bullets and numbered lists
    [/\s+/g, " "], // Collapse whitespace
];
export function cleanForSpeech(text) {
    let result = text;
    for (const [pattern, replacement] of CLEAN_PATTERNS) {
        result = result.replace(pattern, replacement);
    }
    return result.trim();
}
/**
 * Count words in text efficiently without creating full array.
 */
export function countWords(text) {
    let count = 0;
    let inWord = false;
    for (let i = 0; i < text.length; i++) {
        const isSpace = /\s/.test(text[i]);
        if (!isSpace && !inWord) {
            count++;
            inWord = true;
        }
        else if (isSpace) {
            inWord = false;
        }
    }
    return count;
}
export function truncateToWords(text, maxWords) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    return words.slice(0, maxWords).join(" ") + "...";
}
export async function summarizeWithClaude(text, maxWords, customPrompt) {
    const prompt = customPrompt
        ? `${customPrompt}\n\nKeep response under ${maxWords} words.\n\nText:\n${text}`
        : DEFAULT_TTS_PROMPT.replace("{max_words}", String(maxWords)) + text;
    return new Promise((resolve) => {
        try {
            // Use stdin to pass prompt to avoid shell escaping issues
            // Use haiku for fast, cheap summarization
            const proc = spawn("claude", ["--print", "--model", "haiku"], {
                stdio: ["pipe", "pipe", "pipe"],
            });
            let output = "";
            // Note: stderr is collected but not used currently. In the future, it could be logged
            // for debugging purposes, but for now we silently ignore errors from the claude CLI.
            let _stderr = "";
            proc.stdout.on("data", (data) => {
                output += data.toString();
            });
            proc.stderr.on("data", (data) => {
                _stderr += data.toString();
            });
            proc.on("close", (code) => {
                if (code === 0 && output.trim()) {
                    resolve(output.trim());
                }
                else {
                    resolve(null);
                }
            });
            proc.on("error", () => {
                resolve(null);
            });
            // Write prompt to stdin and close it
            proc.stdin.write(prompt);
            proc.stdin.end();
        }
        catch {
            resolve(null);
        }
    });
}
