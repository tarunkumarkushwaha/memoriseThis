import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useRemoteControl } from "../hooks/useRemoteControl";
import { SafeAreaView } from "react-native-safe-area-context";

const DISPLAY_INFO = {
  UP: { name: "UP", symbol: "▲" },
  DOWN: { name: "DOWN", symbol: "▼" },
  LEFT: { name: "LEFT", symbol: "◄" },
  RIGHT: { name: "RIGHT", symbol: "►" },
  CENTER: { name: "SELECT / ENTER", symbol: "OK" },
};

export default function RemoteTester() {
  const [lastAction, setLastAction] = useState({
    name: "PRESS ANY BUTTON",
    symbol: "🎮",
    time: "Waiting for input...",
  });

  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const triggerVisualPulse = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 180 }),
    );
    glow.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 300 }),
    );
  }, [scale, glow]);

  // Hook handles remote input, logging, and automatic back navigation!
  const { direction, code, GamepadListener } = useRemoteControl({
    onPress: (dir, keycode) => {
      const info = DISPLAY_INFO[dir];
      if (!info) return;

      setLastAction({
        name: `${info.name} clicked (Code: ${keycode})`,
        symbol: info.symbol,
        time: new Date().toLocaleTimeString(),
      });
      triggerVisualPulse();
    },
    autoNavigateBack: true,
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(glow.value, [0, 1], ["#334155", "#38bdf8"]),
    shadowColor: "#38bdf8",
    shadowOpacity: glow.value * 0.8,
    shadowRadius: 15,
  }));

  function HiddenGamepadListener({ children }) {
    return (
      <View style={styles.hiddenGamepadWrapper} pointerEvents="none">
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <HiddenGamepadListener>{GamepadListener}</HiddenGamepadListener> */}
      {GamepadListener}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KeyCode: {code ?? "null"}</Text>
        <Text style={styles.headerSubtitle}>
          Current Direction: {direction ?? "NONE"}
        </Text>
      </View>

      <View style={styles.displayArea}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <Text style={styles.symbolText}>{lastAction.symbol}</Text>
          <Text style={styles.actionName}>{lastAction.name}</Text>
          <Text style={styles.timestampText}>{lastAction.time}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
  },
  hiddenGamepadWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
    zIndex: -1,
  },
  header: { alignItems: "center" },
  headerTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "700" },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  displayArea: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  card: {
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    elevation: 8,
  },
  symbolText: { fontSize: 48, color: "#38bdf8", marginBottom: 8 },
  actionName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  timestampText: { color: "#64748b", fontSize: 12, marginTop: 10 },
  dpadGrid: { alignItems: "center", justifyContent: "center" },
  middleRow: { flexDirection: "row" },
  gridCell: {
    width: 54,
    height: 54,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    margin: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  centerCell: { backgroundColor: "#0284c7", borderColor: "#38bdf8" },
  activeCell: { backgroundColor: "#0284c7", borderColor: "#38bdf8" },
  activeCenterCell: { backgroundColor: "#2563eb", borderColor: "#60a5fa" },
  gridText: { color: "#64748b", fontSize: 18, fontWeight: "700" },
  activeGridText: { color: "#ffffff" },
  topCell: { alignSelf: "center" },
  bottomCell: { alignSelf: "center" },
  debugText: { color: "#475569", fontSize: 12, marginTop: 4 },
});
