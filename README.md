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
  - scrollable with a visible scrollbar and a “grab handle” + hint
- **Implicit multiply** for things like `2(3+4)` or `2π`
- **Expo Router** structure: screen lives at `app/(tabs)/index.tsx`

> Note: right now **C** clears everything (full reset). Backspace and a distinct **AC** can be added if desired.

## 🧰 Tech Stack
- React Native (Expo)
- Expo Router
- TypeScript (created by the template)
- `expr-eval` for safe expression parsing/evaluation

## 🚀 Run locally
```bash
npm install
npx expo start
