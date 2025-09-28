// app/(tabs)/index.tsx
import { StatusBar } from "expo-status-bar";
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

export default function HomeScreen() {
  // Display state (we’ll wire real math next)
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");

  // UI state
  const [isSciOpen, setIsSciOpen] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");

  // Simple height animation for the scientific panel
  const sciHeight = useRef(new Animated.Value(0)).current;
  const targetHeight = 200; // px; adjust as you like

  useEffect(() => {
    Animated.timing(sciHeight, {
      toValue: isSciOpen ? targetHeight : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isSciOpen]);

  // Basic keypad layout (prominent)
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

  // Scientific keypad (de-emphasized)
  const sciRows = useMemo(
    () => [
      ["sin", "cos", "tan", angleMode],
      ["ln", "log", "√", "x²"],
      ["π", "e", "(", ")"],
      ["x^y", "1/x", "!", "AC"],
    ],
    [angleMode]
  );

  function onKeyPress(label: string) {
    // Placeholder behavior to prove UI works. We’ll add real math next.
    switch (label) {
      case "C":
      case "AC":
        setExpression("");
        setResult("0");
        return;
      case "±":
        setExpression((prev) =>
          prev.startsWith("−") ? prev.slice(1) : prev ? "−" + prev : prev
        );
        return;
      case "⋯ More":
        setIsSciOpen((v) => !v);
        return;
      case "DEG":
      case "RAD":
        setAngleMode((m) => (m === "DEG" ? "RAD" : "DEG"));
        return;
      case "=":
        // For now just mirror expression
        setResult(expression || "0");
        return;
      default:
        setExpression((prev) => (prev + label).trim());
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
            label={label}
            onPress={onKeyPress}
            variant={
              isOperator ? "operator" : label === "C" ? "accent" : isMore ? "muted" : "default"
            }
            compact={false}
            wide={isZero}
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
        <View pointerEvents={isSciOpen ? "auto" : "none"} style={styles.scientificInner}>
          {sciRows.map(renderSciRow)}
        </View>
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
}: {
  label: string;
  onPress: (label: string) => void;
  variant?: KeyVariant;
  compact?: boolean;
  wide?: boolean;
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
        numberOfLines={1}
      >
        {label}
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

  keyText: { color: "#e7ebf0", fontSize: 24, fontWeight: "600" },
  keyTextOperator: { color: "#e7ebf0" },
  keyTextAccent: { color: "#ffffff" },
  keyTextMuted: { color: "#9aa0a6" },
  keyTextScientific: { color: "#c7cbd3", fontSize: 18, fontWeight: "600" },
  keyTextToggle: { color: "#aeb7ff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  keyTextCompact: { fontSize: 18, fontWeight: "600" },
});
