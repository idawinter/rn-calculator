# RN Calculator (Expo + React Native)

A simple, mobile-first calculator built with **React Native** using **Expo** and the **Expo Router** template.

## 🎯 Purpose
This app demonstrates:
- A clean basic calculator UX (0–9, ., +, −, ×, ÷, =, %, ±)
- A de-emphasized “More functions” panel that scrolls independently

## ✨ Features
- **Basic keypad**: digits, decimal, + − × ÷, equals
- **Extras**: clear (`C`), percent (`%`), sign toggle (`±`)
- **Expression display**: compact expression line + large result line
- **More functions panel** (collapsed by default):
  - `π`, `e`, `√`, `x²`, `x^y`, `(`, `)`
  - Scrollable with a visible scrollbar and a “grab handle” + hint
- **Implicit multiply** for things like `2(3+4)` or `2π`
- **Pink theme with light/dark toggle** (tap the chip at the top)
- **Haptics on key press** (light taps on keys, stronger bump on `=`)

## 🧰 Tech Stack
- React Native (Expo)
- Expo Router
- TypeScript (created by the template)
- `expr-eval` for safe expression parsing/evaluation
- `expo-haptics` for tactile feedback

## 🚀 Run locally
```bash
npm install
npx expo start


# Additional Notes

## Overview
This calculator is built with **React Native (Expo)** using the **Expo Router** template. The UI emphasizes basic operations, with advanced functions behind a collapsible “More functions” panel.

## Key Design Decisions:

- Keep basic operations prominent; advanced functions live behind “More functions.”

- Collapsible panel is scrollable with a visible indicator and a small grab handle + “Scroll for more” hint.

- Lightweight device integration via Haptics to reinforce touch feedback.

- Avoid heavy math libs; expr-eval is enough for this level and safe to run on-device.

- Theme support kept simple: pink palette in both dark and light modes.

## Features Implemented
- Basic ops: `0–9`, `.`, `+`, `−`, `×`, `÷`, `=`, `%`, `±`
- Advanced tokens: `π`, `e`, `√`, `x²`, `x^y`, `(`, `)`
- Implicit multiply: supports `2(3+4)` and `2π`
- UI polish: distinct styles for operators, toggleable panel, visible scrollbar

## What I Considered (and deferred)
- Separate **AC** button + **Backspace** behavior (tested, reverted for now)
- Trig functions with **DEG/RAD** toggle
- Memory keys (M+, M−, MR, MC)
- Haptics & accessibility refinements

## Challenges & Resolutions
- **Layout with advanced keys:** Expanding the panel initially hid the `=` row. Solution: limit panel height and make it scrollable.
- **Discoverability:** Users might not realize the panel scrolls. Solution: show a grab handle + hint, and enable the scroll indicator.
- **GitHub authentication:** Resolved by using a Personal Access Token for `git push`.

## Next Steps (if time allows)
- Wire `sin`, `cos`, `tan`, `ln`, `log`, `1/x`, `!`, and DEG/RAD
- Add Backspace on tap of **C** and AC on long-press
- Add unit tests for expression sanitization and evaluation helpers
