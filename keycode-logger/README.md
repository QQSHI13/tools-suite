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

Running on [OpenClaw](https://openclaw.ai)
