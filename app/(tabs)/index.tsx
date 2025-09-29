// app/(tabs)/index.tsx
import * as Haptics from "expo-haptics";
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
type ThemeMode = "dark" | "light";

const parser = new Parser();

// --------- theme ---------
type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  primary: string; // pink accent
  keyDefault: string;
  keyOperator: string;
  keyAccent: string;
  keyMuted: string;
  keyScientific: string;
  text: string;
  textDim: string;
  textAccent: string;
  border: string;
  borderAlt: string;
  handle: string;
};

const THEMES: Record<ThemeMode, ThemeColors> = {
  dark: {
    bg: "#0b0b0c",
    surface: "#0b0b0c",
    surfaceAlt: "#0e0f11",
    primary: "#ff4da6",
    keyDefault: "#1a1c22",
    keyOperator: "#2b2f3a",
    keyAccent: "#ff4da6",
    keyMuted: "#15171c",
    keyScientific: "#14161b",
    text: "#ffffff",
    textDim: "#9aa0a6",
    textAccent: "#ffffff",
    border: "#1f222a",
    borderAlt: "#3a4150",
    handle: "#2a2f3a",
  },
  light: {
    bg: "#fff8fb",
    surface: "#fff8fb",
    surfaceAlt: "#fff0f6",
    primary: "#ff2d8a",
    keyDefault: "#ffe6f2",
    keyOperator: "#ffd6ea",
    keyAccent: "#ff2d8a",
    keyMuted: "#ffeef6",
    keyScientific: "#ffe6f2",
    text: "#1a1a1a",
    textDim: "#5c5f66",
    textAccent: "#ffffff",
    border: "#ffd1e5",
    borderAlt: "#ffbddb",
    handle: "#e7a9c4",
  },
};

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
  // theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const t = THEMES[themeMode];
  const styles = useMemo(() => createStyles(t), [t]);

  // display state
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");

  // ui state
  const [isSciOpen, setIsSciOpen] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG"); // (trig wired later)

  // animate scientific panel
  const sciHeight = useRef(new Animated.Value(0)).current;
  const targetHeight = 120; // keep "=" visible

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
    // Haptics (stronger so it's noticeable)
  if (Platform.OS !== "web") {
    if (label === "=") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

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

      // ---- scientific basics wired ----
      case "π":
      case "e": {
        setExpression((prev) => appendToken(prev, label));
        return;
      }
      case "x²": {
        setExpression((prev) => {
          if (!prev) return prev;
          const last = prev.slice(-1);
          if (endsWithValueToken(last)) return prev + "^2";
          return prev;
        });
        return;
      }
      case "√": {
        setExpression((prev) => {
          const numMatch = prev.match(/(\d+(\.\d+)?)$/);
          if (numMatch) {
            const [full, n] = numMatch;
            return prev.slice(0, -full.length) + `sqrt(${n})`;
          }
          return appendToken(prev, "sqrt(");
        });
        return;
      }
      case "x^y": {
        setExpression((prev) => {
          if (!prev) return prev;
          const last = prev.slice(-1);
          if (endsWithValueToken(last)) return prev + "^";
          return prev;
        });
        return;
      }
      // ---------------------------------

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

      default:
        return;
    }
  }

  // theme toggle
  function toggleTheme() {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setThemeMode((m) => (m === "dark" ? "light" : "dark"));
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
            label={label}
            onPress={onKeyPress}
            variant={
              isOperator ? "operator" : label === "C" ? "accent" : isMore ? "muted" : "default"
            }
            compact={false}
            wide={isZero}
            display={isMore ? "More functions" : undefined} // keep static label
            styles={styles}
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
            styles={styles}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={Platform.OS === "ios" ? (themeMode === "dark" ? "light" : "dark") : "auto"} />

      {/* Top bar with theme toggle */}
      <View style={styles.topBar}>
        <Pressable onPress={toggleTheme} style={styles.themeChip} android_ripple={{ borderless: true }}>
          <Text style={styles.themeChipText}>
            {themeMode === "dark" ? "🌙  Dark • Pink" : "☀️  Light • Pink"}
          </Text>
        </Pressable>
      </View>

      {/* Display */}
      <View style={styles.display}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.expressionWrap}
        >
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
  styles,
}: {
  label: string;
  onPress: (label: string) => void;
  variant?: KeyVariant;
  compact?: boolean;
  wide?: boolean;
  display?: string; // for custom label text
  styles: ReturnType<typeof createStyles>;
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
        {display ?? label}
      </Text>
    </Pressable>
  );
}

const BUTTON = 72;
const SPACE = 10;

function createStyles(t: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },

    topBar: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      backgroundColor: t.surface,
      alignItems: "flex-end",
    },
    themeChip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: t.primary + "22", // translucent pink
      borderWidth: 1,
      borderColor: t.borderAlt,
    },
    themeChipText: {
      color: t.primary,
      fontSize: 12,
      fontWeight: "700",
    },

    display: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      minHeight: 140,
      backgroundColor: t.surface,
      justifyContent: "flex-end",
    },
    expressionWrap: { alignItems: "center" },
    expressionText: { color: t.textDim, fontSize: 24, letterSpacing: 0.5 },
    resultText: { color: t.text, fontSize: 48, fontWeight: "700", marginTop: 6 },

    scientificPanel: {
      overflow: "hidden",
      backgroundColor: t.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    scientificInner: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 6,
      opacity: 0.98,
    },
    handleWrap: { alignItems: "center", paddingTop: 6 },
    handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: t.handle, marginBottom: 6 },
    handleHint: { color: t.textDim, fontSize: 12, fontWeight: "500", marginBottom: 6 },

    sciRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: SPACE,
    },

    keypad: { padding: 12, backgroundColor: t.surface },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: SPACE,
    },

    key: {
      height: BUTTON,
      width: (BUTTON * 4 + SPACE * 3) / 4,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    keyWide: { flexGrow: 1, width: undefined },
    keyCompact: { height: 56, borderRadius: 14 },

    keyDefault: { backgroundColor: t.keyDefault },
    keyOperator: { backgroundColor: t.keyOperator, borderWidth: 1, borderColor: t.borderAlt },
    keyAccent: { backgroundColor: t.keyAccent },
    keyMuted: { backgroundColor: t.keyMuted, borderWidth: 1, borderColor: t.border },
    keyScientific: { backgroundColor: t.keyScientific, borderWidth: 1, borderColor: t.border },
    keyToggle: { backgroundColor: t.keyMuted, borderWidth: 1, borderColor: t.primary },

    keyPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

    keyText: {
      color: t.text,
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      width: "100%",
    },
    keyTextOperator: { color: t.text },
    keyTextAccent: { color: t.textAccent },
    keyTextMuted: { color: t.textDim, fontSize: 11, fontWeight: "600" },
    keyTextScientific: { color: t.textDim, fontSize: 18, fontWeight: "600" },
    keyTextToggle: { color: t.primary, fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
    keyTextCompact: { fontSize: 18, fontWeight: "600" },
  });
}
