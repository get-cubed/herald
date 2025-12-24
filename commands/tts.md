---
description: Configure TTS provider (macos, windows, elevenlabs)
argument-hint: [show | provider <macos|windows|elevenlabs> | elevenlabs <api_key|voice_id> <value>]
allowed-tools: Bash
---

Configure the text-to-speech provider for herald.

**Available providers:**
- `macos` - Built-in macOS `say` command (default on macOS)
- `windows` - Built-in Windows SAPI speech synthesis (default on Windows)
- `elevenlabs` - ElevenLabs API (requires API key and voice ID)

**Commands:**
- `show` - Display current TTS configuration
- `provider <name>` - Switch TTS provider
- `elevenlabs api_key <key>` - Set ElevenLabs API key
- `elevenlabs voice_id <id>` - Set ElevenLabs voice ID

**Examples:**
- `/herald:tts show`
- `/herald:tts provider macos`
- `/herald:tts provider windows`
- `/herald:tts provider elevenlabs`
- `/herald:tts elevenlabs api_key sk-xxxxx`
- `/herald:tts elevenlabs voice_id EXAVITQu4vr4xnSDxMaL`

!`node ${CLAUDE_PLUGIN_ROOT}/dist/cli/set-tts.js $ARGUMENTS`
