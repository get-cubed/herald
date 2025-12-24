# ElevenLabs Setup Guide

ElevenLabs provides high-quality AI voices for Herald's TTS notifications. This guide covers obtaining credentials and configuring Herald.

## Prerequisites

- An ElevenLabs account (free tier available)
- Herald plugin installed

## Step 1: Get an API Key

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign in
2. Click your profile icon in the bottom-left corner
3. Select **Profile + API key**
4. Click **Generate API Key** or copy your existing key
5. Save the key securely - it starts with `sk_` or similar

### Required API Key Permissions

If creating a scoped API key (rather than using a full-access key), ensure these permissions are enabled:

| Permission | Purpose |
|------------|---------|
| `text_to_speech` | Generate speech from text |
| `user_read` | Validate API key and check account status |

To set permissions when creating a key:
1. Go to **Developers** > **API Keys** in ElevenLabs
2. Click **Create API Key**
3. Under permissions, select at minimum: **Text to Speech** and **Users (Read)**
4. Optionally set a monthly character limit

Without these permissions, Herald will fail with authorization errors.

## Step 2: Get a Voice ID

### Option A: Use a Default Voice

ElevenLabs provides several pre-made voices. Popular options:

| Voice | Style | Voice ID |
|-------|-------|----------|
| Rachel | Calm, professional | `21m00Tcm4TlvDq8ikWAM` |
| Adam | Deep, narrative | `pNInz6obpgDQGcFmaJgB` |
| Antoni | Warm, friendly | `ErXwobaYiN019PkySvjV` |
| Bella | Soft, gentle | `EXAVITQu4vr4xnSDxMaL` |
| Elli | Young, clear | `MF3mGyEYCl7XYWbV9V6O` |

### Option B: Find Your Voice ID

1. Go to [elevenlabs.io/voices](https://elevenlabs.io/app/voice-library)
2. Browse or search for a voice
3. Click on a voice to open its details
4. The Voice ID is in the URL: `elevenlabs.io/app/voice-lab/[VOICE_ID]`
5. Or click the **ID** button to copy the voice ID

### Option C: Clone Your Own Voice

1. Go to **Voice Lab** in the ElevenLabs dashboard
2. Click **Add Voice** > **Instant Voice Clone**
3. Upload audio samples of the voice
4. Name your voice and create it
5. Copy the Voice ID from the voice details

## Step 3: Configure Herald

Run these commands in Claude Code:

```
/herald:tts provider elevenlabs
/herald:tts elevenlabs api_key YOUR_API_KEY
/herald:tts elevenlabs voice_id YOUR_VOICE_ID
```

Example with a real voice ID:

```
/herald:tts provider elevenlabs
/herald:tts elevenlabs api_key sk_abc123...
/herald:tts elevenlabs voice_id 21m00Tcm4TlvDq8ikWAM
```

## Step 4: Verify Setup

Check configuration:

```
/herald:status
```

Expected output shows ElevenLabs configured:

```
Herald Configuration
  Enabled: true
  Style: tts
  TTS Provider: elevenlabs
  ElevenLabs: configured
  ...
```

Test with a notification:

```
/herald:style tts
```

Then let Claude complete a response - Herald should speak using ElevenLabs.

## Configuration Reference

Herald stores ElevenLabs settings in `~/.config/herald/config.json`:

```json
{
  "tts": {
    "provider": "elevenlabs",
    "elevenlabs": {
      "api_key": "sk_...",
      "voice_id": "21m00Tcm4TlvDq8ikWAM"
    }
  }
}
```

## Technical Details

Herald uses:
- **Model**: `eleven_turbo_v2_5` (fast, high-quality)
- **Voice settings**: Balanced stability (0.5) and similarity boost (0.5)
- **Audio format**: MP3, played via platform audio player

## Pricing

ElevenLabs offers:
- **Free tier**: ~10,000 characters/month
- **Starter**: $5/month for 30,000 characters
- **Creator**: $22/month for 100,000 characters

Herald summaries typically use 200-400 characters each, so the free tier supports 25-50 notifications per month.

## Troubleshooting

### "ElevenLabs API key is required"

API key not set. Run:
```
/herald:tts elevenlabs api_key YOUR_KEY
```

### "ElevenLabs voice ID is required"

Voice ID not set. Run:
```
/herald:tts elevenlabs voice_id YOUR_VOICE_ID
```

### API Error 401

Invalid API key or missing permissions. Check:

1. **Verify the key** in your ElevenLabs dashboard
2. **Check permissions** - key must have `text_to_speech` and `user_read` scopes
3. Reconfigure with a valid key:
```
/herald:tts elevenlabs api_key NEW_KEY
```

### API Error 403

Insufficient permissions. The API key lacks required scopes:
- Ensure `text_to_speech` permission is enabled
- Ensure `user_read` permission is enabled (for key validation)

Create a new key with correct permissions or use a full-access key.

### API Error 422

Invalid voice ID. Check the voice exists in your account:
1. Go to elevenlabs.io/app/voice-library
2. Find the voice and copy its ID
3. Reconfigure: `/herald:tts elevenlabs voice_id CORRECT_ID`

### No Audio Playing

Check platform audio player:
- **macOS**: Requires `afplay` (built-in)
- **Windows**: Uses PowerShell Media Player
- **Linux**: Requires `mpv` - install with `sudo apt install mpv`

### Slow Response

ElevenLabs adds ~1-2 seconds latency for API calls. For faster notifications:
- Use shorter summaries: `/herald:preferences max_words 25`
- Or switch to platform TTS: `/herald:tts provider macos`
