# Herald Troubleshooting Guide

This guide covers common issues and solutions for Herald notifications.

## Diagnostic Steps

Before troubleshooting specific issues:

1. **Check status**: Run `/herald:status` to see current configuration
2. **Verify enabled**: Ensure `enabled: true` in status output
3. **Check system volume**: Ensure audio is not muted
4. **Test basic audio**: Try `/herald:style alerts` to test simple sound playback

## Common Issues

### No Notifications Playing

**Symptoms**: Herald doesn't make any sound after Claude finishes.

**Causes and Solutions**:

1. **Herald is disabled**
   - Check: `/herald:status` shows `enabled: false`
   - Fix: `/herald:enable`

2. **System volume muted**
   - Check system volume settings
   - Test with other audio

3. **Duplicate detection**
   - Herald skips duplicate messages within a short window
   - This is intentional to prevent repeated notifications
   - Wait a moment or change the response content

4. **Lock timeout**
   - If another Herald process is playing, new requests wait
   - After timeout, the request is skipped
   - This prevents audio overlap

5. **Hook not triggering**
   - Verify hook installation: check `hooks/hooks.json` exists
   - Restart Claude Code to reload hooks

### TTS Not Speaking

**Symptoms**: Alert sounds work, but TTS produces no speech.

**Causes and Solutions**:

1. **macOS: Speech synthesis not available**
   - Check: System Settings > Accessibility > Spoken Content
   - Ensure a system voice is selected
   - Try: `say "test"` in terminal

2. **Windows: SAPI not available**
   - Check: Settings > Time & Language > Speech
   - Ensure a voice is installed
   - Try: `PowerShell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('test')"`

3. **ElevenLabs configuration issues**
   - See "ElevenLabs Not Working" section below

4. **Transcript not available**
   - If transcript_path is missing, Herald says "Done"
   - This is expected for very short interactions

### ElevenLabs Not Working

**Symptoms**: Configured ElevenLabs but no speech.

**Causes and Solutions**:

1. **Missing API key**
   - Error: "ElevenLabs API key is required"
   - Fix: `/herald:tts elevenlabs api_key YOUR_KEY`

2. **Missing voice ID**
   - Error: "ElevenLabs voice ID is required"
   - Fix: `/herald:tts elevenlabs voice_id YOUR_VOICE_ID`

3. **Invalid API key (401 error)**
   - Verify key at elevenlabs.io > Profile > API key
   - Ensure key has required permissions (see below)
   - Regenerate if needed
   - Reconfigure: `/herald:tts elevenlabs api_key NEW_KEY`

4. **Missing API key permissions (401/403 error)**
   - API key must have `text_to_speech` and `user_read` scopes
   - Go to Developers > API Keys in ElevenLabs
   - Create new key with: Text to Speech + Users (Read) permissions
   - Reconfigure: `/herald:tts elevenlabs api_key NEW_KEY`

5. **Invalid voice ID (422 error)**
   - Verify voice exists in your ElevenLabs account
   - Copy correct ID from voice library
   - Reconfigure: `/herald:tts elevenlabs voice_id CORRECT_ID`

6. **No credits remaining**
   - Check usage at elevenlabs.io > Subscription
   - Upgrade plan or wait for monthly reset
   - Fallback: `/herald:tts provider macos`

7. **Network issues**
   - Check internet connection
   - ElevenLabs requires API access to api.elevenlabs.io

8. **Audio player missing (Linux)**
   - ElevenLabs returns MP3 files
   - Linux requires `mpv`: `sudo apt install mpv`

### Wrong Window Activating

**Symptoms**: Herald activates the wrong application.

**Causes and Solutions**:

1. **VS Code detection**
   - Herald checks `TERM_PROGRAM=vscode` and `VSCODE_*` env vars
   - If running in VS Code terminal but wrong app activates, check environment

2. **Terminal detection**
   - Herald detects: Ghostty, iTerm, Terminal.app, Alacritty, Kitty, WezTerm, Hyper
   - Uses `TERM_PROGRAM` environment variable
   - Unknown terminals default to VS Code activation

3. **Windows Terminal**
   - Detected via `WT_SESSION` environment variable

4. **Disable activation**
   - If problematic: `/herald:preferences activate_editor off`

### Media Not Pausing/Resuming

**Symptoms**: Music doesn't pause during TTS.

**Background**: Herald pauses media players during TTS, then resumes.

**Causes and Solutions**:

1. **Unsupported player**
   - macOS supported: Spotify, Music, VLC, Deezer, TIDAL
   - Windows supported: Spotify, iTunes, VLC
   - Other players won't be paused

2. **Player not responding**
   - AppleScript/PowerShell may timeout
   - Herald continues without pause (audio may overlap)

3. **Windows media key not working**
   - Some apps don't respond to media keys
   - No workaround available

### Notifications Too Frequent

**Symptoms**: Getting notifications for every small interaction.

**Solutions**:

1. **Disable for permissions/idle**
   - Herald triggers on Stop, Notification events
   - Notification events include permission prompts
   - No selective disable currently available

2. **Disable entirely when not needed**
   - `/herald:disable` when working on quick tasks
   - `/herald:enable` when starting longer tasks

### Summaries Too Long/Short

**Symptoms**: TTS reads too much or too little.

**Solutions**:

1. **Adjust max words**
   - Default is 50 words
   - Shorter: `/herald:preferences max_words 25`
   - Longer: `/herald:preferences max_words 100`

2. **Custom summary prompt**
   - Override summarization: `/herald:preferences summary_prompt "Summarize in one sentence"`
   - Reset to default: `/herald:preferences summary_prompt reset`

## Platform-Specific Issues

### macOS

**Speech not working**:
- Check System Settings > Accessibility > Spoken Content
- Test: `say "hello"` in terminal
- May need to download a voice

**AppleScript permissions**:
- System Settings > Privacy & Security > Automation
- Ensure Terminal/VS Code can control other apps

**Media control permissions**:
- System Settings > Privacy & Security > Automation
- Grant permission for Spotify, Music, etc.

### Windows

**SAPI not speaking**:
- Settings > Time & Language > Speech
- Ensure a TTS voice is installed
- Download additional voices if needed

**PowerShell execution policy**:
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Windows Terminal activation**:
- Detected via `WT_SESSION` environment variable
- May not work in all configurations

### Linux

**No audio player**:
- ElevenLabs requires an audio player for MP3
- Install mpv: `sudo apt install mpv`

**System TTS**:
- Linux system TTS not currently supported
- Use ElevenLabs for TTS on Linux

## Debug Mode

To see Herald's operation:

1. Check hook execution with Claude Code debug mode:
   ```
   claude --debug
   ```

2. Look for hook invocation logs mentioning `herald`

3. Check for errors in hook output

## Configuration Reset

To reset Herald to defaults:

1. Delete config file:
   ```bash
   rm ~/.config/herald/config.json
   ```

2. Reconfigure:
   ```
   /herald:enable
   /herald:style tts
   ```

## Getting Help

If issues persist:

1. Check Herald version: `/herald:status`
2. Review configuration file: `~/.config/herald/config.json`
3. Report issues at: https://github.com/al3xjohnson/herald/issues
