export type TTSProvider = "macos" | "windows" | "elevenlabs";

export interface TTSProviderConfig {
  provider: TTSProvider;
  elevenlabs?: {
    apiKey: string;
    voiceId: string;
  };
}

export interface HeraldConfig {
  enabled: boolean;
  style: "tts" | "alerts";
  tts: TTSProviderConfig;
  preferences: {
    max_words: number;
    summary_prompt: string | null;
    activate_editor: boolean;
  };
}

export interface StopHookInput {
  transcript_path?: string;
  session_id?: string;
  cwd?: string;
}

export interface NotificationHookInput {
  type: string;
  message?: string;
  cwd?: string;
}

export interface TranscriptMessage {
  type: "user" | "assistant" | "system";
  message?: {
    content: Array<{ type: string; text?: string }>;
  };
}

export const DEFAULT_CONFIG: HeraldConfig = {
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
- Just output the condensed summary directly

Text:
`;
