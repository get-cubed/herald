# Playback Control System

This document describes how Herald prevents duplicate plays and coordinates multiple simultaneous notifications.

## Overview

Herald uses a **wait-and-play** pattern with two key mechanisms:

1. **Deduplication** - Recent plays are tracked by content hash to prevent the same message from playing twice within 5 minutes
2. **Player Lock** - Only one process can play audio at a time; others wait their turn

## Architecture

```mermaid
graph TD
    subgraph "Coordination Files"
        A[~/.config/herald/recent.json<br/>Content hashes + timestamps]
        B[~/.config/herald/player.lock<br/>timestamp:pid format]
    end

    subgraph "Hooks"
        C[on-stop.ts]
        D[on-notification.ts]
    end

    C --> A
    C --> B
    D --> A
    D --> B
```

### Files

| File | Purpose | Format |
|------|---------|--------|
| `recent.json` | Tracks recently played content hashes (max 10 entries) | `[{hash, timestamp}, ...]` |
| `player.lock` | Ensures single player at a time | `{timestamp}:{pid}` |

## Stop Hook Flow

The stop hook fires when Claude finishes a task. It plays either TTS (text-to-speech) or an alert sound.

```mermaid
flowchart TD
    A[Hook triggered] --> B{Enabled?}
    B -->|No| Z[Exit]
    B -->|Yes| C[Read stdin for hook input]

    C --> D{Style?}
    D -->|TTS| E[Extract text from transcript]
    D -->|Alerts| F[Create alert identifier]

    E --> G[Summarize if needed]
    G --> H[Hash content]
    F --> H

    H --> I{Check recent.json<br/>Is duplicate?}
    I -->|Yes| Z
    I -->|No| J[Record hash in recent.json]

    J --> K[Wait for player.lock<br/>Poll every 100ms<br/>Up to 5 minutes]

    K --> L{Got lock?}
    L -->|Timeout| Z
    L -->|Yes| M{Style?}

    M -->|TTS| N[Pause media<br/>Speak text<br/>Resume media]
    M -->|Alerts| O[Play alert sound<br/>Wait 1 second]

    N --> P[Release player.lock]
    O --> P
    P --> Z
```

### Stop Hook: TTS Mode

```mermaid
sequenceDiagram
    participant H as Hook Process
    participant R as recent.json
    participant L as player.lock
    participant T as TTS Provider
    participant M as Media Players

    H->>R: Hash message content
    H->>R: Check if duplicate
    alt Duplicate
        H->>H: Exit immediately
    end
    H->>R: Record hash + timestamp

    loop Until lock acquired or 5min timeout
        H->>L: Try acquire (atomic wx)
        alt Lock held by active process
            H->>H: Wait 100ms
        end
    end

    H->>M: Pause playing media
    H->>T: Speak message
    T-->>H: Complete
    H->>M: Resume media
    H->>L: Release lock
```

### Stop Hook: Alert Mode

```mermaid
sequenceDiagram
    participant H as Hook Process
    participant R as recent.json
    participant L as player.lock
    participant S as System Sound

    H->>R: Hash "alert:{session_id}"
    H->>R: Check if duplicate
    alt Duplicate
        H->>H: Exit immediately
    end
    H->>R: Record hash + timestamp

    loop Until lock acquired or 5min timeout
        H->>L: Try acquire (atomic wx)
        alt Lock held
            H->>H: Wait 100ms
        end
    end

    H->>S: Play alert sound
    H->>H: Wait 1 second (min delay)
    H->>L: Release lock
```

## Notification Hook Flow

The notification hook fires when Claude needs user attention (permission prompts, questions, etc.).

```mermaid
flowchart TD
    A[Hook triggered] --> B{Enabled?}
    B -->|No| Z[Exit]
    B -->|Yes| C[Read stdin for hook input]

    C --> D{Valid notification type?}
    D -->|No| Z
    D -->|Yes| E{Style?}

    E -->|TTS| F[Set message based on type:<br/>• permission_prompt → 'Claude needs permission'<br/>• elicitation_dialog → 'Claude needs more info'<br/>• default → 'Claude is waiting']
    E -->|Alerts| G[Create ping identifier:<br/>ping:{type}:{session_id}]

    F --> H[Hash content]
    G --> H

    H --> I{Check recent.json<br/>Is duplicate?}
    I -->|Yes| Z
    I -->|No| J[Record hash in recent.json]

    J --> K[Wait for player.lock<br/>Poll every 100ms<br/>Up to 5 minutes]

    K --> L{Got lock?}
    L -->|Timeout| Z
    L -->|Yes| M{Style?}

    M -->|TTS| N[Pause media<br/>Speak message<br/>Resume media]
    M -->|Alerts| O[Play ping sound<br/>Wait 1 second]

    N --> P[Release player.lock]
    O --> P
    P --> Z
```

## Player Lock Details

The player lock ensures only one process plays audio at a time.

```mermaid
flowchart TD
    A[acquirePlayerLock] --> B{Lock file exists?}
    B -->|No| F[Create lock with wx flag]
    B -->|Yes| C[Read lock content]

    C --> D{Parse timestamp:pid}
    D -->|Invalid format| E[Delete stale lock]
    D -->|Valid| G{Timestamp expired?<br/>≥ 5 minutes old}

    G -->|Yes| E
    G -->|No| H{PID still running?<br/>kill pid, 0}

    H -->|No| E
    H -->|Yes| I[Return false<br/>Lock held by active process]

    E --> F
    F --> J{Atomic create succeeded?}
    J -->|Yes| K[Write timestamp:pid<br/>Return true]
    J -->|EEXIST| I
    J -->|Other error| L[Return true<br/>Fail open]
```

### Stale Lock Detection

A lock is considered stale if:
- Timestamp is ≥ 5 minutes old, OR
- The PID in the lock file is no longer running

This handles crashed processes without waiting for timeout.

## Deduplication Details

Content is deduplicated using SHA256 hashes (first 16 chars).

```mermaid
flowchart TD
    A[checkAndRecord hash] --> B[Acquire history lock]
    B --> C[Read recent.json]
    C --> D[Filter out entries > 5min old]
    D --> E{Hash in filtered list?}
    E -->|Yes| F[Release lock<br/>Return false - duplicate]
    E -->|No| G[Add hash + timestamp]
    G --> H[Write recent.json]
    H --> I[Release lock<br/>Return true - new message]
```

### Hash Examples

| Content | Hash (16 chars) |
|---------|-----------------|
| "Done" | `a3f2b8c1d4e5f6a7` |
| "Claude needs permission" | `b7c8d9e0f1a2b3c4` |
| "alert:abc123-session-id" | `c4d5e6f7a8b9c0d1` |
| "ping:permission_prompt:abc123" | `d5e6f7a8b9c0d1e2` |

## Timing Guarantees

| Scenario | Behavior |
|----------|----------|
| Same message within 5 min | Blocked (duplicate hash) |
| Same message after 5 min | Allowed (hash expired) |
| Different messages simultaneously | Each waits its turn, plays in sequence |
| Alerts in rapid succession | 1 second minimum gap |
| Pings in rapid succession | 1 second minimum gap |
| Process waiting for lock | Times out after 5 minutes |
| Process crashes while holding lock | Detected via PID check |
| History file size | Automatically trimmed to last 10 entries |

## Example Scenarios

### Scenario 1: Two Claude sessions finish simultaneously

```mermaid
sequenceDiagram
    participant S1 as Session 1
    participant S2 as Session 2
    participant R as recent.json
    participant L as player.lock

    Note over S1,S2: Both finish at same time

    S1->>R: Check hash "message A"
    S2->>R: Check hash "message B"
    S1->>R: Record hash A
    S2->>R: Record hash B

    S1->>L: Acquire lock ✓
    S2->>L: Acquire lock ✗ (held)

    S1->>S1: Play message A
    S2->>S2: Wait 100ms...
    S2->>L: Retry acquire ✗
    S2->>S2: Wait 100ms...

    S1->>L: Release lock
    S2->>L: Acquire lock ✓
    S2->>S2: Play message B
    S2->>L: Release lock
```

### Scenario 2: Duplicate notification blocked

```mermaid
sequenceDiagram
    participant N1 as Notification 1
    participant N2 as Notification 2
    participant R as recent.json

    N1->>R: Check hash "Claude needs permission"
    Note right of R: Not found
    N1->>R: Record hash
    N1->>N1: Wait for lock, play, release

    Note over N1,N2: Same notification fires again

    N2->>R: Check hash "Claude needs permission"
    Note right of R: Found! (< 5 min old)
    N2->>N2: Exit immediately (duplicate)
```

### Scenario 3: Crashed process recovery

```mermaid
sequenceDiagram
    participant P1 as Process 1
    participant P2 as Process 2
    participant L as player.lock

    P1->>L: Acquire lock (PID 12345)
    P1->>P1: Playing...
    Note over P1: Process crashes!

    P2->>L: Try acquire
    P2->>L: Read lock: "timestamp:12345"
    P2->>P2: kill(12345, 0) → ESRCH
    Note right of P2: PID not running!
    P2->>L: Delete stale lock
    P2->>L: Create new lock (PID 67890)
    P2->>P2: Play message
    P2->>L: Release lock
```
