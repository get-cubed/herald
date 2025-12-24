---
name: Herald Configuration
description: This skill should be used when the user asks "how do I configure Herald?", "how do I set up ElevenLabs?", "configure TTS", "change herald settings", "set up text-to-speech", "herald preferences", "elevenlabs api key", "herald not working", or needs help with Herald notification configuration, TTS providers, or troubleshooting.
---

# Herald Configuration

Herald provides configurable notifications for Claude Code with two styles: text-to-speech (TTS) summaries or alert sounds. This skill covers configuration, TTS provider setup, and troubleshooting.

## Quick Start

Enable Herald and set notification style:

```
/herald:enable
/herald:style tts       # or "alerts" for sound-only
```

Check current configuration:

```
/herald:status
```

## Configuration File

Herald stores settings in `~/.config/herald/config.json`:

```json
{
  "enabled": true,
  "style": "alerts",
  "tts": {
    "provider": "macos",
    "elevenlabs": {
      "api_key": "your-key",
      "voice_id": "voice-id"
    }
  },
  "preferences": {
    "max_words": 50,
    "summary_prompt": null,
    "activate_editor": true
  }
}
```

## Notification Styles

### TTS Mode (`/herald:style tts`)

Reads a summary of Claude's response aloud, then activates the editor/terminal window.

- Summarizes response to ~50 words (configurable)
- Uses platform TTS or ElevenLabs
- Activates window after speaking

### Alerts Mode (`/herald:style alerts`)

Plays a notification sound and activates the window.

- Quick audio notification
- No speech synthesis
- Lower latency than TTS

## TTS Providers

### Built-in Providers

| Provider | Platform | Command |
|----------|----------|---------|
| `macos` | macOS | `/herald:tts provider macos` |
| `windows` | Windows | `/herald:tts provider windows` |

Built-in providers require no setup. Herald auto-detects the platform.

### ElevenLabs (Premium Voices)

For high-quality voices on any platform, use ElevenLabs:

```
/herald:tts provider elevenlabs
/herald:tts elevenlabs api_key YOUR_API_KEY
/herald:tts elevenlabs voice_id YOUR_VOICE_ID
```

**Required API key permissions**: `text_to_speech` and `user_read` scopes.

For detailed ElevenLabs setup including obtaining API keys, voice IDs, and configuring permissions, see `references/elevenlabs-setup.md`.

## Preferences

Configure TTS behavior with `/herald:preferences`:

### Max Words

Limit summary length (default: 50):

```
/herald:preferences max_words 30
```

### Custom Summary Prompt

Override the default summarization prompt:

```
/herald:preferences summary "Summarize in one sentence, focusing on what was accomplished"
```

Reset to default:

```
/herald:preferences summary clear
```

### Editor Activation

Control whether Herald activates the editor/terminal after notifications:

```
/herald:preferences activate_editor off
/herald:preferences activate_editor on
```

Herald auto-detects the running environment:
- VS Code (integrated terminal)
- Terminal apps: Ghostty, iTerm, Terminal.app, Alacritty, Kitty, WezTerm, Hyper
- Windows Terminal

## Commands Reference

| Command | Description |
|---------|-------------|
| `/herald:enable` | Enable notifications |
| `/herald:disable` | Disable notifications |
| `/herald:status` | Show current configuration |
| `/herald:style <tts\|alerts>` | Set notification style |
| `/herald:preferences` | Configure TTS settings |
| `/herald:tts` | Configure TTS provider |

## Hook Events

Herald listens to two Claude Code events:

### Stop Event

Triggers when Claude finishes a response. Herald:
1. Reads the transcript
2. Summarizes the response (for TTS mode)
3. Speaks or plays alert sound
4. Activates the editor window

### Notification Event

Triggers on permission prompts and idle prompts. Herald plays a brief notification to alert the user that input is needed.

## Common Configuration Tasks

### Switch from Alerts to TTS

```
/herald:style tts
```

### Use ElevenLabs Instead of System TTS

```
/herald:tts provider elevenlabs
/herald:tts elevenlabs api_key sk-...
/herald:tts elevenlabs voice_id EXAVITQu4...
```

### Disable Window Activation

```
/herald:preferences activate_editor off
```

### Shorter Summaries

```
/herald:preferences max_words 25
```

### Temporarily Disable

```
/herald:disable
```

## Troubleshooting

For common issues and solutions, see `references/troubleshooting.md`.

### Quick Fixes

**No sound playing:**
- Check `/herald:status` to verify enabled
- Ensure system volume is not muted
- Try `/herald:style alerts` to test basic audio

**ElevenLabs not working:**
- Verify API key with `/herald:status`
- Check voice ID is valid
- Ensure API key has `text_to_speech` and `user_read` permissions
- Ensure API key has available credits

**Wrong window activating:**
- Herald detects VS Code vs terminal automatically
- Check `TERM_PROGRAM` environment variable
- Try `/herald:preferences activate_editor off` if problematic

## Additional Resources

### Reference Files

- **`references/elevenlabs-setup.md`** - Complete ElevenLabs setup guide with API key and voice ID instructions
- **`references/troubleshooting.md`** - Detailed troubleshooting for common issues
