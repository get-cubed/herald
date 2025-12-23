---
description: Set herald notification style (tts or alerts)
argument-hint: <tts|alerts>
allowed-tools: Bash
---

Set the notification style for when Claude finishes responding.

**Styles:**
- `tts` - Text-to-speech reads the response aloud
- `alerts` - Play a sound and activate VS Code

Use `/herald:disable` to turn off notifications entirely.

!`node ${CLAUDE_PLUGIN_ROOT}/dist/cli/set-style.js $ARGUMENTS`
