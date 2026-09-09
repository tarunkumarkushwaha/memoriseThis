import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { useControllerNav } from "../hooks/useControllerNav";

const DICE_SOUND = require("../assets/music/dice.mp3");

const DICE_FACES = [
  "dice-one",
  "dice-two",
  "dice-three",
  "dice-four",
  "dice-five",
  "dice-six",
];

const BOUNCE_SPRING = { damping: 10, stiffness: 200, mass: 0.5 };
const FOCUS_SPRING = { damping: 12, stiffness: 180, mass: 0.6 };

export default function DiceRollerZone() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [diceCount, setDiceCount] = useState(2);
  const [diceValues, setDiceValues] = useState([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState([]);
  const [focusedId, setFocusedId] = useState("roll");

  const diceSound = useAudioPlayer(DICE_SOUND);
  const playSound = useCallback((p) => {
    try {
      p.seekTo(0);
      p.play();
    } catch (e) {}
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    playSound(diceSound);

    let iterations = 0;
    const interval = setInterval(() => {
      setDiceValues(
        Array.from(
          { length: diceCount },
          () => Math.floor(Math.random() * 6) + 1,
        ),
      );
      iterations++;
      if (iterations >= 8) {
        clearInterval(interval);
        const finalValues = Array.from(
          { length: diceCount },
          () => Math.floor(Math.random() * 6) + 1,
        );
        setDiceValues(finalValues);
        setIsRolling(false);

        const sum = finalValues.reduce((a, b) => a + b, 0);
        setHistory((prev) => [sum, ...prev.slice(0, 4)]);
      }
    }, 60);
  }, [diceCount, isRolling]);

  const handleSelectCount = (count) => {
    if (isRolling) return;
    setDiceCount(count);
    setDiceValues(
      Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1),
    );
  };

  const goToMenu = () => router.push("/gamelist");

  const selectFocused = () => {
    if (focusedId === "roll") return rollDice();
    if (focusedId === "back") return goToMenu();
    if (focusedId.startsWith("count-")) {
      const cnt = parseInt(focusedId.replace("count-", ""), 10);
      handleSelectCount(cnt);
    }
  };

  const moveMenuFocus = (dir) => {
    const focusMap = {
      roll: { up: "count-2", down: "back" },
      back: { up: "roll" },
      "count-1": { right: "count-2", down: "roll" },
      "count-2": { left: "count-1", right: "count-3", down: "roll" },
      "count-3": { left: "count-2", right: "count-4", down: "roll" },
      "count-4": { left: "count-3", down: "roll" },
    };
    const next = focusMap[focusedId]?.[dir];
    if (next) setFocusedId(next);
  };

  useControllerNav({
    onUp: () => moveMenuFocus("up"),
    onDown: () => moveMenuFocus("down"),
    onLeft: () => moveMenuFocus("left"),
    onRight: () => moveMenuFocus("right"),
    onSelect: selectFocused,
  });

  const currentSum = diceValues.reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hud}>
        {/* <Pressable onPress={goToMenu} style={styles.backBtn}>
          <Text style={styles.hudText}>← Exit</Text>
        </Pressable> */}
        <Text style={styles.title}>ASMR Dice Roller</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* Dice Count Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Number of Dice:</Text>
          <View style={styles.selectorRow}>
            {[1, 2, 3, 4].map((num) => (
              <CountButton
                key={num}
                id={`count-${num}`}
                count={num}
                isSelected={diceCount === num}
                isFocused={focusedId === `count-${num}`}
                onFocusId={setFocusedId}
                onPress={() => handleSelectCount(num)}
              />
            ))}
          </View>
        </View>

        <Pressable style={styles.matArea} onPress={rollDice}>
          <View style={styles.diceContainer}>
            {diceValues.map((val, idx) => (
              <DiceFace
                key={`${idx}-${diceCount}`}
                value={val}
                isRolling={isRolling}
                fontScale={SCREEN_WIDTH < 400 ? 1 : 1.25}
              />
            ))}
          </View>

          <Animated.View entering={FadeIn} style={styles.sumBadge}>
            <Text style={styles.sumLabel}>TOTAL</Text>
            <Text style={styles.sumValue}>{currentSum}</Text>
          </Animated.View>
        </Pressable>

        <View style={styles.controlsRow}>
          <ActionButton
            id="roll"
            label={isRolling ? "Rolling..." : "Roll Dice 🎲"}
            isFocused={focusedId === "roll"}
            onFocusId={setFocusedId}
            onPress={rollDice}
            disabled={isRolling}
          />
          <ActionButton
            id="back"
            label="Back to Menu"
            variant="secondary"
            isFocused={focusedId === "back"}
            onFocusId={setFocusedId}
            onPress={goToMenu}
          />
        </View>

        <Animated.View
          entering={FadeInUp.duration(300)}
          style={styles.historyRow}
        >
          <Text style={styles.historyLabel}>Recent Rolls:</Text>
          {history.length > 0 ? (
            history.map((h, i) => (
              <View key={i} style={styles.historyChip}>
                <Text style={styles.historyText}>{h}</Text>
              </View>
            ))
          ) : (
            <View key={i} style={styles.historyChip}>
              <Text style={styles.historyText}>No history</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function DiceFace({ value, isRolling, fontScale }) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRolling) {
      rotateX.value = 0;
      rotateY.value = 0;

      rotateX.value = withTiming(360, { duration: 420 });
      rotateY.value = withTiming(360, { duration: 420 });
      scale.value = withSequence(
        withTiming(1.25, { duration: 200 }),
        withSpring(1, BOUNCE_SPRING),
      );
    } else {
      rotateX.value = withTiming(0, { duration: 80 });
      rotateY.value = withTiming(0, { duration: 80 });
      scale.value = withSequence(
        withSpring(1.15, BOUNCE_SPRING),
        withSpring(1, BOUNCE_SPRING),
      );
    }
  }, [isRolling, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.dice, animatedStyle]}>
      <FontAwesome5
        name={DICE_FACES[value - 1]}
        size={34 * fontScale}
        color="#0f172a"
        solid
      />
    </Animated.View>
  );
}

function CountButton({ id, count, isSelected, isFocused, onFocusId, onPress }) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.12 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [isSelected ? "#6366f1" : "rgba(255,255,255,0.15)", "#ffffff"],
    ),
    backgroundColor: isSelected ? "#6366f1" : "rgba(255,255,255,0.06)",
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
    >
      <Animated.View style={[styles.countBtn, animatedStyle]}>
        <Text style={[styles.countText, isSelected && { color: "#ffffff" }]}>
          {count}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function ActionButton({
  id,
  label,
  variant = "primary",
  isFocused,
  onFocusId,
  onPress,
  disabled,
}) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.06 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#ffffff"],
    ),
    shadowOpacity: focusAnim.value * 0.6,
    elevation: focusAnim.value * 10,
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.actionBtn,
          variant === "secondary" && styles.actionBtnSecondary,
          disabled && { opacity: 0.6 },
          animatedStyle,
        ]}
      >
        <Text style={styles.actionBtnText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  hudText: { color: "#F8FAFC", fontSize: 15, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: "#f8fafc" },
  backBtn: { paddingRight: 10 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  selectorContainer: { alignItems: "center", gap: 8 },
  selectorLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  selectorRow: { flexDirection: "row", gap: 12 },
  countBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#94a3b8", fontSize: 16, fontWeight: "800" },
  matArea: {
    width: "100%",
    maxWidth: 460,
    height: 220,
    backgroundColor: "#064e3b",
    borderColor: "#047857",
    borderWidth: 6,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  diceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dice: {
    width: 68,
    height: 68,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  sumBadge: {
    position: "absolute",
    bottom: -18,
    backgroundColor: "#0f172a",
    borderColor: "#047857",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sumLabel: { color: "#a78bfa", fontSize: 11, fontWeight: "800" },
  sumValue: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  controlsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 20,
    alignItems: "center",
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "#6366f1",
    shadowColor: "#6366f1",
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#ffffff",
  },
  actionBtnText: { fontWeight: "bold", color: "#fff", textAlign: "center" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  historyLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  historyChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
});
