import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter, Writable } from "stream";

// Create a mock process with stdin/stdout/stderr as EventEmitters
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: Writable;
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdin = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

let mockProcess: ReturnType<typeof createMockProcess>;

// Mock child_process before importing
vi.mock("child_process", () => ({
  spawn: vi.fn(() => mockProcess),
}));

import {
  cleanForSpeech,
  countWords,
  truncateToWords,
  summarizeWithClaude,
} from "./summarize.js";
import { spawn } from "child_process";

describe("cleanForSpeech", () => {
  describe("code removal", () => {
    it("replaces code blocks with placeholder", () => {
      const input = "Here is code:\n```javascript\nconst x = 1;\n```\nDone.";
      const result = cleanForSpeech(input);
      expect(result).toBe("Here is code: (code block) Done.");
    });

    it("handles multiple code blocks", () => {
      const input = "```js\na```\ntext\n```py\nb```";
      const result = cleanForSpeech(input);
      expect(result).toBe("(code block) text (code block)");
    });

    it("removes inline code", () => {
      const input = "Use `npm install` to install";
      const result = cleanForSpeech(input);
      expect(result).toBe("Use to install");
    });

    it("handles multiple inline code segments", () => {
      const input = "Run `foo` then `bar` commands";
      const result = cleanForSpeech(input);
      expect(result).toBe("Run then commands");
    });
  });

  describe("markdown formatting removal", () => {
    it("removes markdown headers", () => {
      const input = "# Title\n## Subtitle\nContent";
      const result = cleanForSpeech(input);
      expect(result).toBe("Title Subtitle Content");
    });

    it("removes h1 through h6 headers", () => {
      const input = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
      const result = cleanForSpeech(input);
      expect(result).toBe("H1 H2 H3 H4 H5 H6");
    });

    it("removes bold formatting", () => {
      const input = "This is **bold** text";
      const result = cleanForSpeech(input);
      expect(result).toBe("This is bold text");
    });

    it("removes italic formatting", () => {
      const input = "This is *italic* text";
      const result = cleanForSpeech(input);
      expect(result).toBe("This is italic text");
    });

    it("removes combined bold/italic", () => {
      const input = "This is **bold** and *italic* text";
      const result = cleanForSpeech(input);
      expect(result).toBe("This is bold and italic text");
    });
  });

  describe("link handling", () => {
    it("keeps link text, removes URL", () => {
      const input = "Check out [this link](https://example.com)";
      const result = cleanForSpeech(input);
      expect(result).toBe("Check out this link");
    });

    it("handles multiple links", () => {
      const input = "[Link 1](url1) and [Link 2](url2)";
      const result = cleanForSpeech(input);
      expect(result).toBe("Link 1 and Link 2");
    });

    it("handles links with complex URLs", () => {
      const input = "[PR](https://github.com/user/repo/pull/123?foo=bar)";
      const result = cleanForSpeech(input);
      expect(result).toBe("PR");
    });
  });

  describe("list handling", () => {
    it("removes bullet list markers", () => {
      const input = "- Item 1\n- Item 2\n- Item 3";
      const result = cleanForSpeech(input);
      expect(result).toBe("Item 1 Item 2 Item 3");
    });

    it("removes asterisk list markers", () => {
      const input = "* Item 1\n* Item 2";
      const result = cleanForSpeech(input);
      expect(result).toBe("Item 1 Item 2");
    });

    it("removes numbered list markers", () => {
      const input = "1. First\n2. Second\n3. Third";
      const result = cleanForSpeech(input);
      expect(result).toBe("First Second Third");
    });

    it("handles indented lists", () => {
      const input = "  - Indented item\n    - Deeper item";
      const result = cleanForSpeech(input);
      expect(result).toBe("Indented item Deeper item");
    });
  });

  describe("whitespace normalization", () => {
    it("collapses multiple spaces", () => {
      const input = "Too    many     spaces";
      const result = cleanForSpeech(input);
      expect(result).toBe("Too many spaces");
    });

    it("collapses newlines to single space", () => {
      const input = "Line 1\n\n\nLine 2";
      const result = cleanForSpeech(input);
      expect(result).toBe("Line 1 Line 2");
    });

    it("trims leading and trailing whitespace", () => {
      const input = "  content with spaces  ";
      const result = cleanForSpeech(input);
      expect(result).toBe("content with spaces");
    });

    it("handles tabs", () => {
      const input = "Tab\there\ttoo";
      const result = cleanForSpeech(input);
      expect(result).toBe("Tab here too");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(cleanForSpeech("")).toBe("");
    });

    it("handles whitespace-only string", () => {
      expect(cleanForSpeech("   \n\t  ")).toBe("");
    });

    it("handles plain text unchanged", () => {
      const input = "Just plain text here";
      expect(cleanForSpeech(input)).toBe("Just plain text here");
    });

    it("handles complex mixed content", () => {
      const input = `# Summary
Here is the **solution**:
\`\`\`js
const x = 1;
\`\`\`
Check the [docs](https://example.com) for details.
- Step 1
- Step 2`;
      const result = cleanForSpeech(input);
      expect(result).toBe(
        "Summary Here is the solution: (code block) Check the docs for details. Step 1 Step 2"
      );
    });
  });
});

describe("countWords", () => {
  it("counts words in simple sentence", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("counts single word", () => {
    expect(countWords("hello")).toBe(1);
  });

  it("handles empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("handles whitespace-only string", () => {
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("handles multiple spaces between words", () => {
    expect(countWords("one   two    three")).toBe(3);
  });

  it("handles leading whitespace", () => {
    expect(countWords("  hello world")).toBe(2);
  });

  it("handles trailing whitespace", () => {
    expect(countWords("hello world  ")).toBe(2);
  });

  it("handles newlines between words", () => {
    expect(countWords("one\ntwo\nthree")).toBe(3);
  });

  it("handles tabs between words", () => {
    expect(countWords("one\ttwo\tthree")).toBe(3);
  });

  it("handles mixed whitespace", () => {
    expect(countWords("one \n\t two")).toBe(2);
  });

  it("handles longer text", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    expect(countWords(text)).toBe(9);
  });

  it("handles hyphenated words as single word", () => {
    expect(countWords("self-contained unit")).toBe(2);
  });

  it("handles contractions as single word", () => {
    expect(countWords("don't do that")).toBe(3);
  });
});

describe("truncateToWords", () => {
  it("returns original text if under limit", () => {
    const text = "Short text";
    expect(truncateToWords(text, 10)).toBe("Short text");
  });

  it("returns original text if exactly at limit", () => {
    const text = "one two three";
    expect(truncateToWords(text, 3)).toBe("one two three");
  });

  it("truncates text over limit with ellipsis", () => {
    const text = "one two three four five";
    expect(truncateToWords(text, 3)).toBe("one two three...");
  });

  it("handles single word limit", () => {
    const text = "hello world";
    expect(truncateToWords(text, 1)).toBe("hello...");
  });

  it("handles empty text", () => {
    expect(truncateToWords("", 10)).toBe("");
  });

  it("handles text with multiple spaces", () => {
    const text = "one   two   three   four";
    const result = truncateToWords(text, 2);
    expect(result).toBe("one two...");
  });

  it("handles large limit", () => {
    const text = "short";
    expect(truncateToWords(text, 1000)).toBe("short");
  });

  it("handles zero limit", () => {
    const text = "some words here";
    expect(truncateToWords(text, 0)).toBe("...");
  });

  it("preserves original spacing when under limit", () => {
    const text = "hello world";
    expect(truncateToWords(text, 100)).toBe("hello world");
  });
});

describe("summarizeWithClaude", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = createMockProcess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns claude CLI with correct arguments", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    // Simulate successful response
    mockProcess.stdout.emit("data", Buffer.from("Summary result"));
    mockProcess.emit("close", 0);

    await resultPromise;

    expect(spawn).toHaveBeenCalledWith("claude", ["--print", "--model", "haiku"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  it("returns output on successful completion", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from("This is the summary"));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBe("This is the summary");
  });

  it("trims whitespace from output", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from("  Summary with spaces  \n"));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBe("Summary with spaces");
  });

  it("returns null on non-zero exit code", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from("Some output"));
    mockProcess.emit("close", 1);

    const result = await resultPromise;
    expect(result).toBeNull();
  });

  it("returns null when output is empty", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from(""));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBeNull();
  });

  it("returns null when output is only whitespace", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from("   \n\t  "));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBeNull();
  });

  it("returns null on process error", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.emit("error", new Error("spawn failed"));

    const result = await resultPromise;
    expect(result).toBeNull();
  });

  it("handles stderr output without failing", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stderr.emit("data", Buffer.from("Some warning"));
    mockProcess.stdout.emit("data", Buffer.from("Valid output"));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBe("Valid output");
  });

  it("uses custom prompt when provided", async () => {
    let capturedInput = "";
    mockProcess.stdin = new Writable({
      write(chunk, _encoding, callback) {
        capturedInput += chunk.toString();
        callback();
      },
    });

    const resultPromise = summarizeWithClaude("input text", 25, "Custom instructions");

    mockProcess.stdout.emit("data", Buffer.from("Result"));
    mockProcess.emit("close", 0);

    await resultPromise;

    expect(capturedInput).toContain("Custom instructions");
    expect(capturedInput).toContain("Keep response under 25 words");
    expect(capturedInput).toContain("input text");
  });

  it("uses default prompt when custom prompt is null", async () => {
    let capturedInput = "";
    mockProcess.stdin = new Writable({
      write(chunk, _encoding, callback) {
        capturedInput += chunk.toString();
        callback();
      },
    });

    const resultPromise = summarizeWithClaude("input text", 30, null);

    mockProcess.stdout.emit("data", Buffer.from("Result"));
    mockProcess.emit("close", 0);

    await resultPromise;

    expect(capturedInput).toContain("TTS summarizer");
    expect(capturedInput).toContain("Maximum 30 words");
    expect(capturedInput).toContain("input text");
  });

  it("uses default prompt when custom prompt is not provided", async () => {
    let capturedInput = "";
    mockProcess.stdin = new Writable({
      write(chunk, _encoding, callback) {
        capturedInput += chunk.toString();
        callback();
      },
    });

    const resultPromise = summarizeWithClaude("test content", 40);

    mockProcess.stdout.emit("data", Buffer.from("Summary"));
    mockProcess.emit("close", 0);

    await resultPromise;

    expect(capturedInput).toContain("TTS summarizer");
    expect(capturedInput).toContain("Maximum 40 words");
    expect(capturedInput).toContain("test content");
  });

  it("concatenates chunked stdout data", async () => {
    const resultPromise = summarizeWithClaude("test text", 50);

    mockProcess.stdout.emit("data", Buffer.from("Part 1 "));
    mockProcess.stdout.emit("data", Buffer.from("Part 2 "));
    mockProcess.stdout.emit("data", Buffer.from("Part 3"));
    mockProcess.emit("close", 0);

    const result = await resultPromise;
    expect(result).toBe("Part 1 Part 2 Part 3");
  });
});
