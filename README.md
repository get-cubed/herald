<h1 align="center">Herald</h1>

<p align="center">
  <strong>Configurable notifications for Claude Code</strong><br>
  TTS, alert sounds, or silent — you choose.
</p>

---

## Features

- **Text-to-Speech** — Hear a summary of Claude's response when it finishes
- **Alert Sounds** — Play a sound and bring VS Code to focus
- **Silent Mode** — No interruptions when you need to concentrate
- **Cross-Platform** — Works on macOS and Windows
- **Swappable TTS Providers** — Built-in macOS/Windows speech, or use ElevenLabs for premium voices

## Installation

```bash
# Add the marketplace
/plugin marketplace add get-cubed/agora

# Install herald
/plugin install herald@agora
```

## Commands

| Command | Description |
|---------|-------------|
| `/herald:enable` | Enable notifications |
| `/herald:disable` | Disable notifications |
| `/herald:status` | Show current configuration |
| `/herald:style <tts\|alerts\|silent>` | Set notification style |
| `/herald:preferences` | Configure TTS settings (max words, custom prompts) |
| `/herald:tts` | Configure TTS provider |

## Notification Styles

- **`tts`** — Text-to-speech reads a summary of the response
- **`alerts`** — Plays a sound and activates VS Code
- **`silent`** — No notifications

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
    "summary_prompt": null
  }
}
```

## License

MIT
