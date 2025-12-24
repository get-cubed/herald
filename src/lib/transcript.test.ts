import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import {
  extractLastAssistantMessage,
  extractLastAssistantMessageFromText,
} from "./transcript.js";
import { readFile } from "fs/promises";

describe("transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("extractLastAssistantMessageFromText", () => {
    it("extracts text from simple assistant message", () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Hello, I can help you." }],
        },
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe(
        "Hello, I can help you."
      );
    });

    it("extracts from last assistant message in multi-line transcript", () => {
      const lines = [
        JSON.stringify({
          type: "user",
          message: { content: [{ type: "text", text: "Hi" }] },
        }),
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "First response" }] },
        }),
        JSON.stringify({
          type: "user",
          message: { content: [{ type: "text", text: "Thanks" }] },
        }),
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Final response" }] },
        }),
      ].join("\n");

      expect(extractLastAssistantMessageFromText(lines)).toBe("Final response");
    });

    it("combines multiple text blocks", () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Part one." },
            { type: "text", text: "Part two." },
          ],
        },
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe(
        "Part one. Part two."
      );
    });

    it("ignores non-text content blocks", () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", name: "Read", input: {} },
            { type: "text", text: "Here is the result." },
            { type: "tool_result", content: "file contents" },
          ],
        },
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe(
        "Here is the result."
      );
    });

    it("skips assistant messages with only non-text content", () => {
      const lines = [
        JSON.stringify({
          type: "assistant",
          message: {
            content: [{ type: "text", text: "Earlier response" }],
          },
        }),
        JSON.stringify({
          type: "assistant",
          message: {
            content: [{ type: "tool_use", name: "Bash", input: {} }],
          },
        }),
      ].join("\n");

      expect(extractLastAssistantMessageFromText(lines)).toBe(
        "Earlier response"
      );
    });

    it("skips assistant messages with empty text", () => {
      const lines = [
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Good response" }] },
        }),
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "   " }] },
        }),
      ].join("\n");

      expect(extractLastAssistantMessageFromText(lines)).toBe("Good response");
    });

    it("trims whitespace from result", () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {
          content: [{ type: "text", text: "  Padded text  " }],
        },
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe("Padded text");
    });

    it('returns "Done" when no assistant messages exist', () => {
      const lines = [
        JSON.stringify({
          type: "user",
          message: { content: [{ type: "text", text: "Hello" }] },
        }),
        JSON.stringify({
          type: "system",
          message: { content: [{ type: "text", text: "System msg" }] },
        }),
      ].join("\n");

      expect(extractLastAssistantMessageFromText(lines)).toBe("Done");
    });

    it('returns "Done" for empty input', () => {
      expect(extractLastAssistantMessageFromText("")).toBe("Done");
    });

    it('returns "Done" for invalid JSON', () => {
      expect(extractLastAssistantMessageFromText("not json")).toBe("Done");
    });

    it('returns "Done" when assistant has no message', () => {
      const jsonl = JSON.stringify({
        type: "assistant",
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe("Done");
    });

    it('returns "Done" when message has no content', () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {},
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe("Done");
    });

    it("handles blocks without text property", () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "text" }, // no text property
            { type: "text", text: "Valid text" },
          ],
        },
      });

      expect(extractLastAssistantMessageFromText(jsonl)).toBe("Valid text");
    });
  });

  describe("extractLastAssistantMessage", () => {
    it("reads file and extracts message", async () => {
      const jsonl = JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "File content" }] },
      });
      vi.mocked(readFile).mockResolvedValue(jsonl);

      const result = await extractLastAssistantMessage("/path/to/transcript");

      expect(readFile).toHaveBeenCalledWith("/path/to/transcript", "utf-8");
      expect(result).toBe("File content");
    });

    it('returns "Done" when file read fails', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      const result = await extractLastAssistantMessage("/missing/file");

      expect(result).toBe("Done");
    });
  });
});
