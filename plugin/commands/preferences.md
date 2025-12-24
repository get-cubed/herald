---
description: Configure herald TTS output preferences
argument-hint: [show | max_words <number> | summary <prompt> | summary clear | activate_editor on/off]
allowed-tools: Bash
---

Configure how herald processes responses for text-to-speech.

**Options:**
- `show` - Display current preferences
- `max_words <number>` - Set maximum words to speak (default: 50)
- `summary <prompt>` - Set custom summarization instructions
- `summary clear` - Reset to default TTS prompt
- `activate_editor on/off` - Enable/disable bringing VS Code to focus (default: on)

**Examples:**
- `/herald:preferences max_words 100`
- `/herald:preferences summary "Just give me the key takeaway in one sentence"`
- `/herald:preferences summary "Focus on what changed or what I need to do next"`
- `/herald:preferences summary clear`
- `/herald:preferences activate_editor off`

!`node ${CLAUDE_PLUGIN_ROOT}/dist/cli/set-preferences.js $ARGUMENTS`
