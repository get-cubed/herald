export const DEFAULT_CONFIG = {
    enabled: true,
    style: "alerts",
    tts: {
        provider: "macos",
    },
    preferences: {
        max_words: 50,
        summary_prompt: null,
        activate_editor: true,
    },
};
export const DEFAULT_TTS_PROMPT = `You are a TTS summarizer. Output ONLY the summary, no preamble.

STRICT RULES:
- Maximum {max_words} words (this is a hard limit)
- Natural spoken language only
- No markdown, bullets, or special characters
- No "Here's a summary" or similar preamble
- Never read URLs aloud - describe the link instead (e.g., "PR created" not "https://github.com/...")
- Just output the condensed summary directly

Text:
`;
