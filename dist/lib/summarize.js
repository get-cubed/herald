import { spawn } from "child_process";
import { DEFAULT_TTS_PROMPT } from "../types.js";
export function cleanForSpeech(text) {
    return text
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, " (code block) ")
        // Remove inline code
        .replace(/`[^`]+`/g, "")
        // Remove markdown headers
        .replace(/^#{1,6}\s+/gm, "")
        // Remove bold/italic
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
        // Remove links, keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Remove bullet points
        .replace(/^[\s]*[-*]\s+/gm, "")
        // Remove numbered lists
        .replace(/^[\s]*\d+\.\s+/gm, "")
        // Collapse whitespace
        .replace(/\s+/g, " ")
        .trim();
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
            let stderr = "";
            proc.stdout.on("data", (data) => {
                output += data.toString();
            });
            proc.stderr.on("data", (data) => {
                stderr += data.toString();
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
