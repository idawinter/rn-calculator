// app/(tabs)/index.tsx
import { StatusBar } from "expo-status-bar";
import { Parser } from "expr-eval";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AngleMode = "DEG" | "RAD";
const parser = new Parser();

// ---------- helpers ----------
function sanitize(expr: string) {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi");
}

function isOp(ch: string) {
  return ["+", "-", "×", "÷", "*", "/"].includes(ch);
}

function endsWithValueToken(ch: string) {
  return /\d/.test(ch) || ch === ")" || ch === "π" || ch === "e";
}

function needsImplicitMultiply(prev: string, nextStartsWith: string) {
  if (!prev) return false;
  const last = prev.slice(-1);
  const nextIsValue = nextStartsWith === "(" || nextStartsWith === "π" || nextStartsWith === "e";
  return endsWithValueToken(last) && nextIsValue;
}

function replaceLastNumber(expr: string, replacer: (num: string) => string) {
  const m = expr.match(/(\d+(\.\d+)?)$/);
  if (!m) return expr;
  const [full, num] = m;
  return expr.slice(0, -full.length) + replacer(num);
}

function applyPercent(expr: string) {
  // turns the last number into (n/100)
  return replaceLastNumber(expr, (n) => `(${n}/100)`);
}

function toggleSign(expr: string) {
  // If the expression ends with (-n), unwrap to n; else wrap last number as (-n)
  if (/\(-\d+(\.\d+)?\)$/.test(expr)) {
    return expr.replace(/\(-(\d+(\.\d+)?)\)$/, (_s, n) => n);
  }
  const numMatch = expr.match(/(\d+(\.\d+)?)$/);
  if (numMatch) {
    const [full, n] = numMatch;
    return expr.slice(0, -full.length) + `(-${n})`;
  }
  return expr.length === 0 ? "-" : expr;
}

function formatResult(value: number) {
  if (!isFinite(value)) return "Error";
  const asStr = value.toString();
  if (asStr.includes("e")) {
    return value.toPrecision(10).replace(/\.?0+$/, "");
  }
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

// ---------- component ----------
export default function HomeScreen() {
  // display state
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");

  // ui state
  const [isSciOpen, setIsSciOpen] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG"); // (trig wired later)

  // animate scientific panel
  const sciHeight = useRef(new Animated.Value(0)).current;
  const targetHeight = 120;

  useEffect(() => {
    Animated.timing(sciHeight, {
      toValue: isSciOpen ? targetHeight : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isSciOpen]);

  // layouts
  const basicRows = useMemo(
    () => [
      ["C", "±", "%", "÷"],
      ["7", "8", "9", "×"],
      ["4", "5", "6", "−"],
      ["1", "2", "3", "+"],
      ["0", ".", "=", "⋯ More"],
    ],
    []
  );

  const sciRows = useMemo(
    () => [
      ["sin", "cos", "tan", angleMode], // trig later
      ["ln", "log", "√", "x²"],
      ["π", "e", "(", ")"],
      ["x^y", "1/x", "!", "AC"],
    ],
    [angleMode]
  );

  // evaluation
  function evaluateNow(expr: string) {
    const clean = sanitize(expr);
    try {
      const val = parser.parse(clean).evaluate({
        pi: Math.PI,
        e: Math.E,
      });
      return formatResult(val);
    } catch {
      return "Error";
    }
  }

  function appendToken(prev: string, token: string) {
    // handle implicit multiplication for "(", "π", "e"
    if (needsImplicitMultiply(prev, token[0])) {
      return prev + "×" + token;
    }
    return prev + token;
  }

  // input handler
  function onKeyPress(label: string) {
    switch (label) {
      case "C":
      case "AC":
        setExpression("");
        setResult("0");
        return;

      case "±":
        setExpression((prev) => toggleSign(prev));
        return;

      case "%":
        setExpression((prev) => applyPercent(prev));
        return;

      case "⋯ More":
        setIsSciOpen((v) => !v);
        return;

      case "DEG":
      case "RAD":
        setAngleMode((m) => (m === "DEG" ? "RAD" : "DEG"));
        return;

      // ---- newly wired scientific basics ----
      case "π":
      case "e": {
        setExpression((prev) => appendToken(prev, label));
        return;
      }

      case "x²": {
        // append ^2 to the last value token (number, pi/e, or ')')
        setExpression((prev) => {
          if (!prev) return prev;
          const last = prev.slice(-1);
          if (endsWithValueToken(last)) return prev + "^2";
          return prev; // ignore if nothing to square
        });
        return;
      }

      case "√": {
        // if last token is a number, wrap it: sqrt(n); else start sqrt(
        setExpression((prev) => {
          const numMatch = prev.match(/(\d+(\.\d+)?)$/);
          if (numMatch) {
            const [full, n] = numMatch;
            return prev.slice(0, -full.length) + `sqrt(${n})`;
          }
          // If previous ends with value token like ')' or 'π'/'e', insert implicit × then sqrt(
          const token = "sqrt(";
          return appendToken(prev, token);
        });
        return;
      }

      case "x^y": {
        // only add ^ if there's a value before it
        setExpression((prev) => {
          if (!prev) return prev;
          const last = prev.slice(-1);
          if (endsWithValueToken(last)) return prev + "^";
          return prev;
        });
        return;
      }
      // ---------------------------------------

      case "=": {
        if (!expression.trim()) {
          setResult(result);
          return;
        }
        const r = evaluateNow(expression);
        setResult(r);
        if (r !== "Error") setExpression(r);
        return;
      }

      // basic operators
      case "+":
      case "−":
      case "×":
      case "÷": {
        setExpression((prev) => {
          if (!prev && result !== "0") return result + label; // start from last result
          if (!prev) return ""; // ignore leading operator without a number
          const last = prev.slice(-1);
          if (isOp(last)) return prev.slice(0, -1) + label; // prevent double operators
          return prev + label;
        });
        return;
      }

      // parens + digits + dot
      case "(":
      case ")": {
        setExpression((prev) => appendToken(prev, label));
        return;
      }
      case ".":
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9": {
        setExpression((prev) => (prev + label).trim());
        return;
      }

      // ignore remaining scientific keys for now (sin, cos, tan, ln, log, 1/x, !)
      default:
        return;
    }
  }

  const renderBasicRow = (row: string[], rowIndex: number) => (
    <View key={`brow-${rowIndex}`} style={styles.row}>
      {row.map((label, i) => {
        const isOperator = ["÷", "×", "−", "+", "="].includes(label);
        const isMore = label === "⋯ More";
        const isZero = label === "0";
        return (
          <CalcKey
            key={`bkey-${rowIndex}-${i}`}
            label={label} // keep the internal label so onPress still toggles the panel
            onPress={onKeyPress}
            variant={isOperator ? "operator" : label === "C" ? "accent" : isMore ? "muted" : "default"}
            compact={false}
            wide={isZero}
            display={isMore ? "More functions" : undefined}
          />

        );
      })}
    </View>
  );

  const renderSciRow = (row: string[], rowIndex: number) => (
    <View key={`srow-${rowIndex}`} style={styles.sciRow}>
      {row.map((label, i) => {
        const isToggle = label === "DEG" || label === "RAD";
        return (
          <CalcKey
            key={`skey-${rowIndex}-${i}`}
            label={label}
            onPress={onKeyPress}
            variant={isToggle ? "toggle" : "scientific"}
            compact
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />

      {/* Display */}
      <View style={styles.display}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.expressionWrap}>
          <Text style={styles.expressionText} numberOfLines={1}>
            {expression || " "}
          </Text>
        </ScrollView>
        <Text style={styles.resultText} numberOfLines={1}>
          {result}
        </Text>
      </View>

      {/* Scientific panel (collapsed by default) */}
<Animated.View style={[styles.scientificPanel, { height: sciHeight }]}>
  {isSciOpen && (
    <View style={styles.handleWrap}>
      <View style={styles.handleBar} />
      <Text style={styles.handleHint}>Scroll for more</Text>
    </View>
  )}
  <ScrollView
    style={{ flex: 1 }}
    contentContainerStyle={styles.scientificInner}
    showsVerticalScrollIndicator={true}
    scrollEnabled={isSciOpen}
  >
    {sciRows.map(renderSciRow)}
  </ScrollView>
</Animated.View>

      {/* Basic keypad */}
      <View style={styles.keypad}>{basicRows.map(renderBasicRow)}</View>
    </SafeAreaView>
  );
}

type KeyVariant = "default" | "operator" | "accent" | "muted" | "scientific" | "toggle";

function CalcKey({
  label,
  onPress,
  variant = "default",
  compact = false,
  wide = false,
  display,
}: {
  label: string;
  onPress: (label: string) => void;
  variant?: KeyVariant;
  compact?: boolean;
  wide?: boolean;
  display?: string; // 👈 new
}) {
  const stylesByVariant: Record<KeyVariant, object[]> = {
    default: [styles.key, styles.keyDefault],
    operator: [styles.key, styles.keyOperator],
    accent: [styles.key, styles.keyAccent],
    muted: [styles.key, styles.keyMuted],
    scientific: [styles.key, styles.keyScientific],
    toggle: [styles.key, styles.keyToggle],
  };

  return (
    <Pressable
      onPress={() => onPress(label)}
      style={({ pressed }) => [
        ...stylesByVariant[variant],
        compact && styles.keyCompact,
        wide && styles.keyWide,
        pressed && styles.keyPressed,
      ]}
      android_ripple={{ borderless: true }}
    >
      <Text
        style={[
          styles.keyText,
          variant === "operator" && styles.keyTextOperator,
          variant === "accent" && styles.keyTextAccent,
          variant === "muted" && styles.keyTextMuted,
          variant === "scientific" && styles.keyTextScientific,
          variant === "toggle" && styles.keyTextToggle,
          compact && styles.keyTextCompact,
        ]}
        numberOfLines={2}
      >
        {display ?? label} {/* 👈 use display label if provided */}
      </Text>
    </Pressable>
  );
}

const BUTTON = 72;
const SPACE = 10;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0c" },

  display: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    minHeight: 140,
    backgroundColor: "#0b0b0c",
    justifyContent: "flex-end",
  },
  expressionWrap: { alignItems: "center" },
  expressionText: { color: "#9aa0a6", fontSize: 24, letterSpacing: 0.5 },
  resultText: { color: "#ffffff", fontSize: 48, fontWeight: "700", marginTop: 6 },

  scientificPanel: {
    overflow: "hidden",
    backgroundColor: "#0e0f11",
    borderTopWidth: 1,
    borderTopColor: "#181a1f",
  },
  scientificInner: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    opacity: 0.95,
  },
  sciRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACE,
  },

  keypad: { padding: 12, backgroundColor: "#0b0b0c" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACE,
  },

  key: {
    height: BUTTON,
    width: (BUTTON * 4 + SPACE * 3) / 4, // auto fit 4 per row
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 0,
  },
  keyWide: {
    flexGrow: 1,
    width: undefined,
  },
  keyCompact: {
    height: 56,
    borderRadius: 14,
  },

  keyDefault: { backgroundColor: "#1a1c22" },
  keyOperator: { backgroundColor: "#2b2f3a", borderWidth: 1, borderColor: "#3a4150" },
  keyAccent: { backgroundColor: "#3a4bff" },
  keyMuted: { backgroundColor: "#15171c", borderWidth: 1, borderColor: "#1f222a" },
  keyScientific: { backgroundColor: "#14161b", borderWidth: 1, borderColor: "#222631" },
  keyToggle: { backgroundColor: "#10131a", borderWidth: 1, borderColor: "#3a4bff" },

  keyPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  keyText: {
    color: "#e7ebf0",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center", // center lines
    width: "100%",       // make Text fill the button width so centering works
  },
  
  keyTextOperator: { color: "#e7ebf0" },
  keyTextAccent: { color: "#ffffff" },
  keyTextMuted: { color: "#9aa0a6", fontSize: 11, fontWeight: "600" },
  keyTextScientific: { color: "#c7cbd3", fontSize: 18, fontWeight: "600" },
  keyTextToggle: { color: "#aeb7ff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  keyTextCompact: { fontSize: 18, fontWeight: "600" },

  handleWrap: { alignItems: "center", paddingTop: 6 },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a2f3a",
    marginBottom: 6,
  },
  handleHint: { color: "#9aa0a6", fontSize: 12, fontWeight: "500", marginBottom: 6 },

});
