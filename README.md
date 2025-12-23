<p align="center">
  <img src="docs/images/icon.png" alt="Herald" width="128" height="128">
</p>

<h1 align="center">Herald</h1>

<p align="center">
  <a href="https://github.com/get-cubed/herald/releases"><img src="https://img.shields.io/github/v/release/get-cubed/herald" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
</p>

<p align="center">
  <strong>Configurable notifications for Claude Code</strong><br>
  TTS or alert sounds — you choose.
</p>

---

## Features

- **Text-to-Speech** — Hear a summary of Claude's response when it finishes
- **Alert Sounds** — Play a sound and bring VS Code to focus
- **Cross-Platform** — Works on macOS and Windows
- **Swappable TTS Providers** — Built-in macOS/Windows speech, or use ElevenLabs for premium voices

## Installation

Run these commands in Claude Code:

```
# Add the marketplace (one-time setup)
/plugin marketplace add get-cubed/agora

# Install herald
/plugin install herald@agora

# Enable TTS notifications
/herald:style tts
```

## Commands

| Command | Description |
|---------|-------------|
| `/herald:enable` | Enable notifications |
| `/herald:disable` | Disable notifications |
| `/herald:status` | Show current configuration |
| `/herald:style <tts\|alerts>` | Set notification style |
| `/herald:preferences` | Configure TTS settings (max words, custom prompts, editor activation) |
| `/herald:tts` | Configure TTS provider |

## Notification Styles

- **`tts`** — Text-to-speech reads a summary of the response, then activates VS Code
- **`alerts`** — Plays a sound and activates VS Code

Both modes activate the editor by default. Disable with `/herald:preferences activate_editor off`.

Use `/herald:disable` to turn off notifications entirely.

## TTS Providers

| Provider | Platform | Setup |
|----------|----------|-------|
| `macos` | macOS | Built-in, no setup needed |
| `windows` | Windows | Built-in, no setup needed |
| `elevenlabs` | Any | Requires API key and voice ID |

### Using ElevenLabs

```bash
/herald:tts provider elevenlabs
/herald:tts elevenlabs api_key YOUR_API_KEY
/herald:tts elevenlabs voice_id YOUR_VOICE_ID
```

## Configuration

Herald stores its configuration in `~/.config/herald/config.json`:

```json
{
  "enabled": true,
  "style": "tts",
  "tts": {
    "provider": "macos"
  },
  "preferences": {
    "max_words": 50,
    "summary_prompt": null,
    "activate_editor": true
  }
}
```

## License

MIT
