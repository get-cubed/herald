import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleStop, getStopMessage, type StopDeps } from "./stop-handler.js";
import type { HeraldConfig, StopHookInput } from "../types.js";

describe("stop-handler", () => {
  // Mock TTS provider
  const mockTTSProvider = {
    speak: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockResolvedValue(true),
    name: "mock",
  };

  // Mock dependencies
  const createMockDeps = (): StopDeps => ({
    extractLastAssistantMessage: vi.fn().mockResolvedValue("Hello world"),
    cleanForSpeech: vi.fn((text: string) => text),
    countWords: vi.fn((text: string) => text.split(/\s+/).length),
    truncateToWords: vi.fn((text: string, max: number) =>
      text.split(/\s+/).slice(0, max).join(" ")
    ),
    summarizeWithClaude: vi.fn().mockResolvedValue(null),
    checkAndRecord: vi.fn().mockResolvedValue(true),
    hashContent: vi.fn((content: string) => `hash:${content}`),
    waitForPlayerLock: vi.fn().mockResolvedValue(true),
    releasePlayerLock: vi.fn().mockResolvedValue(undefined),
    playSound: vi.fn(),
    playAlert: vi.fn(),
    getProvider: vi.fn().mockReturnValue(mockTTSProvider),
    withMediaControl: vi.fn((fn) => fn()),
    activateEditor: vi.fn(),
  });

  // Default config
  const createConfig = (overrides?: Partial<HeraldConfig>): HeraldConfig => ({
    enabled: true,
    style: "alerts",
    tts: { provider: "macos" },
    preferences: {
      max_words: 50,
      summary_prompt: null,
      activate_editor: true,
    },
    ...overrides,
  });

  // Default input
  const createInput = (overrides?: Partial<StopHookInput>): StopHookInput => ({
    transcript_path: "/path/to/transcript.jsonl",
    cwd: "/path/to/project",
    session_id: "session-123",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStopMessage", () => {
    describe("alerts mode", () => {
      it("generates alert message with session_id", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "alerts" });
        const input = createInput();

        const result = await getStopMessage(input, config, deps);

        expect(result.isAlert).toBe(true);
        expect(result.content).toBe("alert:session-123");
      });

      it("falls back to project name when no session_id", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "alerts" });
        const input = createInput({ session_id: undefined });

        const result = await getStopMessage(input, config, deps);

        expect(result.content).toBe("alert:project");
      });

      it("falls back to default when no session_id or project", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "alerts" });
        const input = createInput({ session_id: undefined, cwd: undefined });

        const result = await getStopMessage(input, config, deps);

        expect(result.content).toBe("alert:default");
      });
    });

    describe("tts mode", () => {
      it("returns Done when no transcript path", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "tts" });
        const input = createInput({ transcript_path: undefined });

        const result = await getStopMessage(input, config, deps);

        expect(result.isAlert).toBe(false);
        expect(result.content).toBe("Done");
        expect(deps.extractLastAssistantMessage).not.toHaveBeenCalled();
      });

      it("extracts and cleans message when under max words", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.extractLastAssistantMessage).mockResolvedValue(
          "Short message"
        );
        vi.mocked(deps.countWords).mockReturnValue(2);
        const config = createConfig({ style: "tts" });
        const input = createInput();

        const result = await getStopMessage(input, config, deps);

        expect(deps.extractLastAssistantMessage).toHaveBeenCalledWith(
          "/path/to/transcript.jsonl"
        );
        expect(deps.cleanForSpeech).toHaveBeenCalledWith("Short message");
        expect(result.content).toBe("Short message");
      });

      it("summarizes when over max words and Claude succeeds", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.extractLastAssistantMessage).mockResolvedValue(
          "A very long message that exceeds the maximum word count"
        );
        vi.mocked(deps.countWords).mockReturnValue(100);
        vi.mocked(deps.summarizeWithClaude).mockResolvedValue(
          "Summarized message"
        );
        const config = createConfig({
          style: "tts",
          preferences: {
            max_words: 10,
            summary_prompt: null,
            activate_editor: true,
          },
        });
        const input = createInput();

        const result = await getStopMessage(input, config, deps);

        expect(deps.summarizeWithClaude).toHaveBeenCalledWith(
          "A very long message that exceeds the maximum word count",
          10,
          null
        );
        expect(result.content).toBe("Summarized message");
      });

      it("truncates when over max words and Claude fails", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.extractLastAssistantMessage).mockResolvedValue(
          "A very long message"
        );
        vi.mocked(deps.countWords).mockReturnValue(100);
        vi.mocked(deps.summarizeWithClaude).mockResolvedValue(null);
        vi.mocked(deps.truncateToWords).mockReturnValue("A very long");
        const config = createConfig({
          style: "tts",
          preferences: {
            max_words: 3,
            summary_prompt: null,
            activate_editor: true,
          },
        });
        const input = createInput();

        const result = await getStopMessage(input, config, deps);

        expect(deps.truncateToWords).toHaveBeenCalled();
        expect(result.content).toBe("A very long");
      });

      it("passes custom summary prompt to Claude", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.extractLastAssistantMessage).mockResolvedValue(
          "Long message"
        );
        vi.mocked(deps.countWords).mockReturnValue(100);
        const config = createConfig({
          style: "tts",
          preferences: {
            max_words: 10,
            summary_prompt: "Custom prompt",
            activate_editor: true,
          },
        });
        const input = createInput();

        await getStopMessage(input, config, deps);

        expect(deps.summarizeWithClaude).toHaveBeenCalledWith(
          "Long message",
          10,
          "Custom prompt"
        );
      });

      it("returns Done for empty message", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.extractLastAssistantMessage).mockResolvedValue("");
        vi.mocked(deps.countWords).mockReturnValue(0);
        vi.mocked(deps.cleanForSpeech).mockReturnValue("");
        const config = createConfig({ style: "tts" });
        const input = createInput();

        const result = await getStopMessage(input, config, deps);

        expect(result.content).toBe("Done");
      });
    });
  });

  describe("handleStop", () => {
    describe("when disabled", () => {
      it("returns handled: false with reason disabled", async () => {
        const deps = createMockDeps();
        const config = createConfig({ enabled: false });
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: false, reason: "disabled" });
        expect(deps.extractLastAssistantMessage).not.toHaveBeenCalled();
      });
    });

    describe("with duplicate content", () => {
      it("returns handled: false when duplicate detected", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.checkAndRecord).mockResolvedValue(false);
        const config = createConfig();
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: false, reason: "duplicate" });
        expect(deps.waitForPlayerLock).not.toHaveBeenCalled();
      });
    });

    describe("when lock unavailable", () => {
      it("returns handled: false when lock times out", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.waitForPlayerLock).mockResolvedValue(false);
        const config = createConfig();
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: false, reason: "no_lock" });
        expect(deps.playSound).not.toHaveBeenCalled();
        expect(deps.playAlert).not.toHaveBeenCalled();
      });
    });

    describe("alerts mode", () => {
      it("plays alert with editor activation", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "alerts" });
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: true, reason: "played" });
        expect(deps.playAlert).toHaveBeenCalledWith("project");
        expect(deps.playSound).not.toHaveBeenCalled();
        expect(deps.releasePlayerLock).toHaveBeenCalled();
      });

      it("plays sound without editor activation", async () => {
        const deps = createMockDeps();
        const config = createConfig({
          style: "alerts",
          preferences: {
            max_words: 50,
            summary_prompt: null,
            activate_editor: false,
          },
        });
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: true, reason: "played" });
        expect(deps.playSound).toHaveBeenCalledWith("alert");
        expect(deps.playAlert).not.toHaveBeenCalled();
      });
    });

    describe("tts mode", () => {
      it("speaks message with TTS provider", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "tts" });
        const input = createInput();

        const result = await handleStop(input, config, deps);

        expect(result).toEqual({ handled: true, reason: "played" });
        expect(deps.getProvider).toHaveBeenCalledWith(config.tts);
        expect(mockTTSProvider.speak).toHaveBeenCalledWith("Hello world");
        expect(deps.withMediaControl).toHaveBeenCalled();
      });

      it("activates editor before TTS when enabled", async () => {
        const deps = createMockDeps();
        const config = createConfig({ style: "tts" });
        const input = createInput();

        await handleStop(input, config, deps);

        expect(deps.activateEditor).toHaveBeenCalledWith("project");
      });

      it("does not activate editor when disabled", async () => {
        const deps = createMockDeps();
        const config = createConfig({
          style: "tts",
          preferences: {
            max_words: 50,
            summary_prompt: null,
            activate_editor: false,
          },
        });
        const input = createInput();

        await handleStop(input, config, deps);

        expect(deps.activateEditor).not.toHaveBeenCalled();
      });
    });

    describe("lock release", () => {
      it("releases lock after successful playback", async () => {
        const deps = createMockDeps();
        const config = createConfig();
        const input = createInput();

        await handleStop(input, config, deps);

        expect(deps.releasePlayerLock).toHaveBeenCalled();
      });

      it("releases lock even if playback throws", async () => {
        const deps = createMockDeps();
        vi.mocked(deps.playAlert).mockImplementation(() => {
          throw new Error("Playback failed");
        });
        const config = createConfig();
        const input = createInput();

        await expect(handleStop(input, config, deps)).rejects.toThrow(
          "Playback failed"
        );

        expect(deps.releasePlayerLock).toHaveBeenCalled();
      });

      it("releases lock even if TTS throws", async () => {
        const deps = createMockDeps();
        mockTTSProvider.speak.mockRejectedValue(new Error("TTS failed"));
        const config = createConfig({ style: "tts" });
        const input = createInput();

        await expect(handleStop(input, config, deps)).rejects.toThrow(
          "TTS failed"
        );

        expect(deps.releasePlayerLock).toHaveBeenCalled();
      });
    });

    describe("project name extraction", () => {
      it("extracts project name from cwd", async () => {
        const deps = createMockDeps();
        const config = createConfig();
        const input = createInput({ cwd: "/Users/alex/repos/my-project" });

        await handleStop(input, config, deps);

        expect(deps.playAlert).toHaveBeenCalledWith("my-project");
      });

      it("handles missing cwd", async () => {
        const deps = createMockDeps();
        const config = createConfig();
        const input = createInput({ cwd: undefined });

        await handleStop(input, config, deps);

        expect(deps.playAlert).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
