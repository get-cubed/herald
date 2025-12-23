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
    style: "tts" | "alerts" | "silent";
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
        content: Array<{
            type: string;
            text?: string;
        }>;
    };
}
export declare const DEFAULT_CONFIG: HeraldConfig;
export declare const DEFAULT_TTS_PROMPT = "You are a TTS summarizer. Output ONLY the summary, no preamble.\n\nSTRICT RULES:\n- Maximum {max_words} words (this is a hard limit)\n- Natural spoken language only\n- No markdown, bullets, or special characters\n- No \"Here's a summary\" or similar preamble\n- Just output the condensed summary directly\n\nText:\n";
