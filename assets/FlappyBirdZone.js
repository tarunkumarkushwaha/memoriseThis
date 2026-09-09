import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
  FadeIn,
  useFrameCallback,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useControllerNav } from "../hooks/useControllerNav";

const HIGH_SCORE_KEY = "flappybird_highscore";
const LEVEL_UP_EVERY = 5;
const BIRD_SIZE = 38;
const PIPE_WIDTH = 60;
const GRAVITY = 0.42;
const JUMP_IMPULSE = -7.5;

const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

export default function () {
  const router = useRouter();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const [phase, setPhase] = useState("menu"); // menu | playing | gameOver
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [focusedId, setFocusedId] = useState("start");

  // Shared Physics Values for UI thread execution
  const isPlaying = useSharedValue(false);
  const birdY = useSharedValue(SCREEN_HEIGHT * 0.4);
  const birdVelocity = useSharedValue(0);
  const pipeX = useSharedValue(SCREEN_WIDTH + 100);
  const pipeGapY = useSharedValue(150);
  const currentGapHeight = useSharedValue(180);
  const currentSpeed = useSharedValue(3.2);

  const isScored = useRef(false);
  const prevLevelRef = useRef(1);
  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then((v) => {
        if (v) setHighScore(parseInt(v, 10) || 0);
      })
      .catch(() => {});
  }, []);

  // Update speed & gap shared values when level changes
  useEffect(() => {
    currentSpeed.value = 3.2 + (level - 1) * 0.4;
    currentGapHeight.value = Math.max(130, 210 - (level - 1) * 8);
  }, [level, currentSpeed, currentGapHeight]);

  useEffect(() => {
    const nextLevel = Math.floor(score / LEVEL_UP_EVERY) + 1;
    if (nextLevel !== level) setLevel(nextLevel);
  }, [score, level]);

  useEffect(() => {
    if (level > prevLevelRef.current && phase === "playing") {
      prevLevelRef.current = level;
      setShowLevelUp(true);
      const t = setTimeout(() => setShowLevelUp(false), 900);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level, phase]);

  useEffect(() => {
    setFocusedId(phase === "gameOver" ? "play-again" : "start");
  }, [phase]);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    prevLevelRef.current = 1;
    birdY.value = SCREEN_HEIGHT * 0.35;
    birdVelocity.value = JUMP_IMPULSE;
    pipeX.value = SCREEN_WIDTH + 80;

    const initialGap = 180;
    pipeGapY.value = 100 + Math.random() * (SCREEN_HEIGHT - initialGap - 220);
    currentGapHeight.value = initialGap;
    currentSpeed.value = 3.2;

    isScored.current = false;
    setIsNewHighScore(false);
    isPlaying.value = true;
    setPhase("playing");
  };

  const endGame = useCallback(() => {
    isPlaying.value = false;
    setPhase("gameOver");
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      setIsNewHighScore(true);
      AsyncStorage.setItem(HIGH_SCORE_KEY, String(finalScore)).catch(() => {});
    } else {
      setIsNewHighScore(false);
    }
  }, [highScore, isPlaying]);

  const handleFlap = useCallback(() => {
    if (isPlaying.value) {
      birdVelocity.value = JUMP_IMPULSE;
    }
  }, [birdVelocity, isPlaying]);

  const incrementScore = useCallback(() => {
    setScore((s) => s + 1);
  }, []);

  // Frame Loop running smoothly on UI Thread
  useFrameCallback(() => {
    "worklet";
    if (!isPlaying.value) return;

    // Apply Gravity
    birdVelocity.value += GRAVITY;
    birdY.value += birdVelocity.value;

    // Move Pipe
    pipeX.value -= currentSpeed.value;

    // Reset Pipe when off screen
    if (pipeX.value < -PIPE_WIDTH) {
      pipeX.value = SCREEN_WIDTH + 40;
      pipeGapY.value =
        100 + Math.random() * (SCREEN_HEIGHT - currentGapHeight.value - 220);
      isScored.current = false;
    }

    // Check Score Pass
    const birdX = SCREEN_WIDTH * 0.25;
    if (!isScored.current && pipeX.value + PIPE_WIDTH < birdX) {
      isScored.current = true;
      runOnJS(incrementScore)();
    }

    // Collision Detection
    const hitFloor = birdY.value >= SCREEN_HEIGHT - BIRD_SIZE - 20;
    const hitCeiling = birdY.value <= 10;

    const pipeLeft = pipeX.value;
    const pipeRight = pipeX.value + PIPE_WIDTH;
    const inPipeXRange = birdX + BIRD_SIZE > pipeLeft && birdX < pipeRight;

    const gapTop = pipeGapY.value;
    const gapBottom = pipeGapY.value + currentGapHeight.value;
    const hitTopPipe = inPipeXRange && birdY.value < gapTop;
    const hitBottomPipe = inPipeXRange && birdY.value + BIRD_SIZE > gapBottom;

    if (hitFloor || hitCeiling || hitTopPipe || hitBottomPipe) {
      runOnJS(endGame)();
    }
  });

  const goToMenu = () => {
    isPlaying.value = false;
    router.push("/gamelist");
  };

  const selectFocused = () => {
    if (phase === "menu") {
      if (focusedId === "start") return startGame();
      if (focusedId === "back") return goToMenu();
      return;
    }
    if (phase === "playing") {
      return handleFlap();
    }
    if (phase === "gameOver") {
      if (focusedId === "play-again") return startGame();
      if (focusedId === "back") return goToMenu();
    }
  };

  const moveMenuFocus = (dir) => {
    const map =
      phase === "menu"
        ? { back: { down: "start" }, start: { up: "back" } }
        : { "play-again": { right: "back" }, back: { left: "play-again" } };
    const next = map[focusedId]?.[dir];
    if (next) setFocusedId(next);
  };

  useControllerNav({
    onUp: () => (phase === "playing" ? handleFlap() : moveMenuFocus("up")),
    onDown: () => (phase === "playing" ? handleFlap() : moveMenuFocus("down")),
    onLeft: () => (phase === "playing" ? handleFlap() : moveMenuFocus("left")),
    onRight: () =>
      phase === "playing" ? handleFlap() : moveMenuFocus("right"),
    onSelect: selectFocused,
  });

  // Dynamic Animated Styles
  const birdAnimatedStyle = useAnimatedStyle(() => {
    const rotation = Math.min(Math.max(birdVelocity.value * 4, -25), 70);
    return {
      transform: [{ translateY: birdY.value }, { rotate: `${rotation}deg` }],
    };
  });

  const topPipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pipeX.value }],
    height: pipeGapY.value,
  }));

  const bottomPipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pipeX.value }],
    top: pipeGapY.value + currentGapHeight.value,
    height: Math.max(
      0,
      SCREEN_HEIGHT - (pipeGapY.value + currentGapHeight.value),
    ),
  }));

  if (phase === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.menuCard}
          >
            <Text style={styles.title}>Flappy Bird Zone</Text>
            <Text style={styles.subtitle}>
              Press UP, SELECT or TAP screen to flap. Navigate through pipe
              gaps!
            </Text>
            <Text style={styles.highScoreText}>High Score: {highScore}</Text>
            <ActionButton
              id="start"
              label="Start Game"
              fontScale={1}
              isFocused={focusedId === "start"}
              onFocusId={setFocusedId}
              onPress={startGame}
            />
            <ActionButton
              id="back"
              label="Back to Menu"
              variant="secondary"
              fontScale={1}
              isFocused={focusedId === "back"}
              onFocusId={setFocusedId}
              onPress={goToMenu}
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "gameOver") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <Animated.View
            entering={FadeIn.duration(350)}
            style={styles.menuCard}
          >
            <Text style={styles.title}>Game Over</Text>
            {isNewHighScore && (
              <View style={styles.newRecordBadge}>
                <Text style={styles.newRecordText}>NEW HIGH SCORE!</Text>
              </View>
            )}
            <View style={styles.scoreRow}>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreBlockLabel}>Your Score</Text>
                <Text style={styles.scoreBlockValue}>{score}</Text>
              </View>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreBlockLabel}>High Score</Text>
                <Text style={[styles.scoreBlockValue, { color: "#facc15" }]}>
                  {highScore}
                </Text>
              </View>
            </View>
            <Text style={styles.levelReached}>Reached Level {level}</Text>
            <View style={styles.gameOverButtonRow}>
              <ActionButton
                id="play-again"
                label="Play Again"
                fontScale={1}
                isFocused={focusedId === "play-again"}
                onFocusId={setFocusedId}
                onPress={startGame}
              />
              <ActionButton
                id="back"
                label="Back to Menu"
                variant="secondary"
                fontScale={1}
                isFocused={focusedId === "back"}
                onFocusId={setFocusedId}
                onPress={goToMenu}
              />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.gameArea} onPress={handleFlap}>
        {/* HUD */}
        <View style={styles.hud}>
          <Pressable onPress={goToMenu} style={styles.backBtn}>
            <Text style={styles.hudText}>← Exit</Text>
          </Pressable>
          <Text style={styles.hudText}>Score: {score}</Text>
          <Text style={[styles.hudText, { color: "#facc15" }]}>Lv {level}</Text>
        </View>

        {showLevelUp && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.levelUpBanner}
          >
            <Text style={styles.levelUpText}>LEVEL {level}!</Text>
          </Animated.View>
        )}

        {/* Top Pipe */}
        <Animated.View style={[styles.pipe, styles.topPipe, topPipeStyle]} />

        {/* Bottom Pipe */}
        <Animated.View
          style={[styles.pipe, styles.bottomPipe, bottomPipeStyle]}
        />

        {/* Bird */}
        <Animated.View
          style={[
            styles.bird,
            { left: SCREEN_WIDTH * 0.25 },
            birdAnimatedStyle,
          ]}
        >
          <Text style={styles.birdEmoji}>🐤</Text>
        </Animated.View>

        {/* Ground */}
        <View style={styles.ground} />
      </Pressable>
    </SafeAreaView>
  );
}

/* ─────────────────────────── Action Button ─────────────────────────── */

function ActionButton({
  id,
  label,
  variant = "primary",
  fontScale,
  isFocused,
  onFocusId,
  onPress,
}) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.06 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused, scale, focusAnim]);

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
    >
      <Animated.View
        style={[
          styles.actionBtn,
          variant === "secondary" && styles.actionBtnSecondary,
          animatedStyle,
        ]}
      >
        <Text style={[styles.actionBtnText, { fontSize: 15 * fontScale }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  gameArea: { flex: 1, position: "relative" },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  menuCard: {
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 420,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "center",
  },
  subtitle: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  highScoreText: { color: "#facc15", fontWeight: "700" },
  newRecordBadge: {
    backgroundColor: "rgba(250,204,21,0.15)",
    borderColor: "#facc15",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  newRecordText: { color: "#facc15", fontWeight: "900", letterSpacing: 1 },
  scoreRow: { flexDirection: "row", gap: 32, marginTop: 6 },
  scoreBlock: { alignItems: "center" },
  scoreBlockLabel: { color: "#a78bfa", fontWeight: "600" },
  scoreBlockValue: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 2,
  },
  levelReached: { color: "#cbd5e1" },
  gameOverButtonRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    zIndex: 40,
  },
  hudText: { color: "#F8FAFC", fontSize: 15, fontWeight: "800" },
  backBtn: { paddingRight: 6 },
  levelUpBanner: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
    backgroundColor: "rgba(250,204,21,0.15)",
    borderColor: "#facc15",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 8,
    zIndex: 50,
  },
  levelUpText: { color: "#facc15", fontWeight: "900", letterSpacing: 1 },
  bird: {
    position: "absolute",
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  birdEmoji: { fontSize: 32 },
  pipe: {
    position: "absolute",
    width: PIPE_WIDTH,
    backgroundColor: "#10b981",
    borderColor: "#059669",
    borderWidth: 3,
    borderRadius: 6,
    zIndex: 20,
  },
  topPipe: { top: 0, borderTopWidth: 0 },
  bottomPipe: { borderBottomWidth: 0 },
  ground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: "#334155",
    borderTopWidth: 2,
    borderTopColor: "#475569",
    zIndex: 25,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 0 },
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#ffffff",
  },
  actionBtnText: { fontWeight: "bold", color: "#fff", textAlign: "center" },
});
