# Keycode Logger ⌨️

A lightweight keyboard event debugger for developers. Press any key to instantly see detailed event information including key codes, modifiers, and key combinations.

**Live Demo**: https://qqshi13.github.io/keycode-logger/

## Features

- **Visual Key Display** — Shows modifier keys (Ctrl, Alt, Shift, Meta) and main key with distinct styling
- **Full Event Details** — Displays `event.key`, `event.code`, `keyCode`, `which`, `location`, `repeat`, and all modifier flags
- **Event History** — Keeps track of last 50 events with timestamps, click to revisit any event
- **Copy to Clipboard** — One-click copy of key combo + code + key + keyCode
- **Prevent Default Toggle** — Stops arrow keys/space from scrolling while testing

## Usage

1. Open the tool in your browser
2. Press any key to capture the event
3. View detailed event properties in the grid
4. Click "Copy Last" to copy event details to clipboard
5. Click any item in history to view it again

## Event Properties Shown

| Property | Description |
|----------|-------------|
| `event.key` | The key value (e.g., "a", "Enter", "ArrowUp") |
| `event.code` | The physical key code (e.g., "KeyA", "Enter", "ArrowUp") |
| `event.keyCode` | Deprecated but still used legacy key code |
| `event.which` | Deprecated legacy property |
| `event.location` | 0=standard, 1=left, 2=right, 3=numpad |
| `event.repeat` | True if key is being held down |
| `ctrlKey` | Whether Ctrl is pressed |
| `altKey` | Whether Alt is pressed |
| `shiftKey` | Whether Shift is pressed |
| `metaKey` | Whether Meta/Command is pressed |

## Tech Stack

- Vanilla JavaScript (no dependencies)
- CSS custom properties for theming
- GitHub Dark theme (`#0d1117` background)
- Single-file architecture
- GitHub Pages hosting

## Browser Support

Works in all modern browsers that support:
- KeyboardEvent API
- Clipboard API (for copy functionality)
- CSS Grid and Flexbox

## Credits

Built by **QQ** with **Nova** ☄️


---

## What it captures now

| Part | Detail |
|---|---|
| **Presses and releases** | `keydown` and `keyup` (toggleable) — releases are what make chords debuggable, so the "Held" strip shows exactly which keys are down right now, modifiers highlighted |
| **Lock lights** | `CapsLock` / `NumLock` / `ScrollLock` / `AltGraph` read per event via `getModifierState()`, shown as ON/OFF pills |
| **IME composition** | `compositionstart/update/end` plus `event.isComposing` — typing through a Chinese/Japanese IME is visible instead of appearing to do nothing |
| **Event fields** | `type`, `key`, `code`, `keyCode`, `which`, `location`, `repeat`, `isComposing`, `timeStamp`, the four modifier booleans, `event.data`, and the lock state string |
| **History** | newest-first with a `down` / `up` / `IME` badge per row; click any row to reload it into the panel |
| **Most pressed** | per-`code` tally for the session — the fastest way to spot a shortcut collision |
| **Achievements** | 15 badges (first key, 3-key chord, every home-row key, IME, 100/1000 events, 20 events/second, CapsLock typing, function row, numpad, keyCode 0, …) with progress counters, persisted in `localStorage` |
| **Screen readers** | the last event is announced through an `aria-live` region |

## Verification

`check.mjs` runs the page's inline script against a minimal DOM stub and drives it with
synthetic keyboard and IME events — no browser required:

```bash
node check.mjs        # 28/28 checks
```

It covers press/release handling, the held-key set, chord and repeat detection, lock
lights, IME composition, the richer event fields, the aria-live announcement and the
achievement unlocks. It runs in CI on every push and pull request (`.github/workflows/check.yml`).
