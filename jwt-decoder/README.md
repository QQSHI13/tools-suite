# 🔑 JWT Decoder

Decode and inspect JSON Web Tokens. View header, payload, and signature with syntax highlighting.

**Live:** https://qqshi13.github.io/jwt-decoder/

## Features

- 🔓 **Instant Decode** - Paste JWT, see decoded parts immediately
- 🎨 **Syntax Highlighting** - Color-coded JSON for readability
- ⏰ **Expiry Detection** - Shows if token is expired or expires soon
- 📋 **Copy Payload** - Quick copy decoded payload
- 🧪 **Sample Tokens** - Pre-loaded examples to test
- 🌙 **Dark Theme** - Easy on the eyes

## How to Use

1. Paste a JWT token in the input box
2. See decoded Header, Payload, and Signature instantly
3. Red badge = expired, Yellow = expires soon, Green = valid
4. Click "Copy Payload" to copy the decoded data

## Tech Stack

- **Vanilla JavaScript** - No dependencies
- **Base64 URL decoding** - Native browser APIs
- **GitHub Pages** - Free hosting

## What is JWT?

JSON Web Tokens are used for authentication. They contain three parts:
- **Header** - Algorithm and token type
- **Payload** - User data and claims
- **Signature** - Verification hash

---

Built with ❤️ by QQ & Nova ☄️
