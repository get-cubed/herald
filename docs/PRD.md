# Herald - Product Requirements Document

## Overview

Herald is a configurable notification plugin for Claude Code that alerts users when Claude finishes a response or needs user input. It bridges the gap between working in Claude Code and other applications by proactively bringing the user's attention back when a response is ready.

## Problem Statement

When using Claude Code, users often switch to other applications while waiting for responses. This creates friction:

- Users miss when Claude has finished responding
- Users miss permission prompts that require input
- Manual window switching interrupts workflow
- No auditory feedback when responses complete

## Goals

1. **Reduce context switching friction** - Automatically notify users when Claude needs attention
2. **Support multiple notification styles** - Accommodate different user preferences and environments
3. **Cross-platform support** - Work on macOS, Windows, and Linux
4. **Intelligent summarization** - Provide concise TTS summaries of long responses
5. **Prevent notification spam** - Deduplicate rapid-fire notifications

## Features

### Core Notification Modes

| Mode | Description |
|------|-------------|
| **Text-to-Speech (TTS)** | Reads a concise summary of Claude's response aloud, then brings the editor/terminal to focus |
| **Alert Sounds** | Plays a notification sound and activates the window |

### Key Capabilities

- **Smart Deduplication** - Prevents duplicate notifications within a 5-minute window using content hashing
- **Media Awareness** - Automatically pauses music players during TTS, resumes after
- **Window Activation** - Brings the terminal/editor to focus after notification
- **Response Summarization** - Summarizes long responses (>50 words by default) for TTS
- **Permission Prompts** - Notifies when Claude needs user input or permission

### TTS Providers

| Provider | Platform | Requirements |
|----------|----------|--------------|
| macOS | macOS | Built-in (uses `/usr/bin/say`) |
| Windows | Windows | Built-in (uses PowerShell) |
| ElevenLabs | All | API key and voice ID |

### Supported Terminal Emulators

- VS Code integrated terminal
- Ghostty
- iTerm2
- Terminal.app
- Alacritty
- Kitty
- WezTerm
- Hyper
- Windows Terminal

### Media Player Integration (Pause/Resume)

- Spotify
- Apple Music
- VLC
- Deezer
- TIDAL
- iTunes

## Configuration

Configuration is stored at `~/.config/herald/config.json`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master on/off switch |
| `style` | string | `"alerts"` | Notification style: `"tts"` or `"alerts"` |
| `tts.provider` | string | auto | TTS provider: `"macos"`, `"windows"`, or `"elevenlabs"` |
| `preferences.max_words` | number | `50` | Word limit before summarization |
| `preferences.summary_prompt` | string | null | Custom summarization prompt |
| `preferences.activate_editor` | boolean | `true` | Bring window to focus after notification |

### Example Configuration

```json
{
  "enabled": true,
  "style": "tts",
  "tts": {
    "provider": "elevenlabs",
    "elevenlabs": {
      "apiKey": "sk-...",
      "voiceId": "voice-id"
    }
  },
  "preferences": {
    "max_words": 50,
    "activate_editor": true
  }
}
```

## Technical Architecture

### Hook System

Herald implements two Claude Code plugin hooks:

1. **Stop Hook** (`on-stop.js`) - Triggered when Claude finishes responding
2. **Notification Hook** (`on-notification.js`) - Triggered on permission prompts or input requests

### Core Components

| Component | Purpose |
|-----------|---------|
| `lib/config.ts` | Configuration loading and saving |
| `lib/lock.ts` | Atomic file-based locking for concurrency |
| `lib/recent.ts` | History tracking and deduplication |
| `lib/audio.ts` | Platform-specific sound playback |
| `lib/media.ts` | Music player pause/resume |
| `lib/summarize.ts` | Response summarization via Claude |
| `lib/transcript.ts` | Claude Code transcript parsing |
| `tts/*.ts` | TTS provider implementations |

### Design Principles

- **Fail-closed locking** - Errors default to denying access to prevent duplicates
- **Content-based hashing** - Consistent deduplication across notification modes
- **Best-effort media control** - Media failures never block notifications
- **Platform abstraction** - Clean separation of platform-specific code

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | Full | Primary development platform |
| Windows | Full | PowerShell-based integration |
| Linux | Basic | Requires wmctrl and paplay |

## Non-Goals

- Mobile platform support
- Browser extension integration
- Custom sound file support
- Multi-language TTS (uses system defaults)
