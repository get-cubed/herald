import { describe, it, expect } from "vitest";
import { cleanForSpeech, countWords, truncateToWords } from "./summarize.js";

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
