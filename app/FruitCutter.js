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
  withTiming,
  withSpring,
  withSequence,
  interpolateColor,
  runOnJS,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useControllerNav } from "../hooks/useControllerNav";
import { useAudioPlayer } from "expo-audio";

const ZONES = { UP: "UP", DOWN: "DOWN", LEFT: "LEFT", RIGHT: "RIGHT" };
const ZONE_LIST = [ZONES.UP, ZONES.DOWN, ZONES.LEFT, ZONES.RIGHT];
const FRUIT_EMOJIS = ["🍉", "🍎", "🍌", "🍊"];
const FRUIT_SIZE = 60;

const HIGH_SCORE_KEY = "fruitcutter_highscore";
const LEVEL_UP_EVERY = 50;
const BASE_SPAWN_MS = 1300;
const MIN_SPAWN_MS = 550;
const SPAWN_STEP_PER_LEVEL = 70;
const BASE_CATCH_MS = 1000;
const MIN_CATCH_MS = 500;
const CATCH_STEP_PER_LEVEL = 45;

const BOUNCE_SPRING = { damping: 8, stiffness: 220, mass: 0.5 };
const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

function getZoneRect(zone, width, height) {
  const midTop = height * 0.25;
  const midBottom = height * 0.75;
  switch (zone) {
    case ZONES.UP:
      return {
        x0: width * 0.15,
        x1: width * 0.85,
        y0: height * 0.04,
        y1: midTop - FRUIT_SIZE * 0.6,
      };
    case ZONES.DOWN:
      return {
        x0: width * 0.15,
        x1: width * 0.85,
        y0: midBottom + FRUIT_SIZE * 0.2,
        y1: height * 0.94 - FRUIT_SIZE,
      };
    case ZONES.LEFT:
      return {
        x0: width * 0.06,
        x1: width * 0.42,
        y0: midTop + 16,
        y1: midBottom - FRUIT_SIZE - 16,
      };
    case ZONES.RIGHT:
    default:
      return {
        x0: width * 0.58,
        x1: width * 0.94 - FRUIT_SIZE,
        y0: midTop + 16,
        y1: midBottom - FRUIT_SIZE - 16,
      };
  }
}

function randomPointInZone(zone, width, height) {
  const rect = getZoneRect(zone, width, height);
  const x = rect.x0 + Math.random() * Math.max(1, rect.x1 - rect.x0);
  const y = rect.y0 + Math.random() * Math.max(1, rect.y1 - rect.y0);
  return { x, y };
}

function getThrowTrajectory(targetZone, width, height) {
  const { x: targetX, y: targetY } = randomPointInZone(
    targetZone,
    width,
    height,
  );

  const startX = width * 0.2 + Math.random() * (width * 0.6);
  const startY = height + FRUIT_SIZE;

  const apexY = Math.max(height * 0.02, targetY - 40);

  const endX = startX + (targetX - startX) * 1.6;
  const endY = height + FRUIT_SIZE;

  return { startX, startY, targetX, targetY, apexY, endX, endY };
}

export default function FruitCutterZone() {
  const router = useRouter();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const [phase, setPhase] = useState("menu"); // menu | playing | gameOver
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [activeZoneSlash, setActiveZoneSlash] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [focusedId, setFocusedId] = useState("start");
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const spawnRef = useRef(null);
  const prevLevelRef = useRef(1);
  const scoreRef = useRef(0);

  const smash = useAudioPlayer(require("../assets/music/crush.mp3"));
  const bomb = useAudioPlayer(require("../assets/music/bomb.mp3"));
  const gameover = useAudioPlayer(require("../assets/music/lose1.mp3"));

  const playSound = useCallback((player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {}
  }, []);

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

  useEffect(() => {
    const nextLevel = Math.floor(score / LEVEL_UP_EVERY) + 1;
    if (nextLevel !== level) setLevel(nextLevel);
  }, [score]);

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
    setLives(3);
    setLevel(1);
    prevLevelRef.current = 1;
    setFruits([]);
    setIsNewHighScore(false);
    setPhase("playing");
  };

  const endGame = useCallback(() => {
    setPhase("gameOver");
    playSound(gameover);
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      setIsNewHighScore(true);
      AsyncStorage.setItem(HIGH_SCORE_KEY, String(finalScore)).catch(() => {});
    } else {
      setIsNewHighScore(false);
    }
  }, [highScore]);

  const loseLife = useCallback(() => {
    playSound(bomb);
    setLives((l) => {
      const next = Math.max(0, l - 1);
      if (next === 0) setTimeout(() => endGame(), 250);
      return next;
    });
  }, [endGame]);

  const triggerZoneSlash = useCallback(
    (zone) => {
      if (phase !== "playing") return;
      setActiveZoneSlash(zone);
      setTimeout(() => setActiveZoneSlash(null), 100);

      setFruits((prev) =>
        prev.map((f) => {
          if (!f.sliced && f.currentZone === zone) {
            if (f.isBomb) loseLife();
            else {
              setScore((s) => s + 10);
              playSound(smash);
            }
            return { ...f, sliced: true };
          }
          return f;
        }),
      );
    },
    [phase, loseLife],
  );

  const handleFruitZoneUpdate = useCallback((id, zone) => {
    setFruits((prev) =>
      prev.map((f) => (f.id === id ? { ...f, currentZone: zone } : f)),
    );
  }, []);

  const handleFruitExit = useCallback(
    (id, sliced, isBomb) => {
      //   if (phase === "playing" && !sliced && !isBomb) loseLife();
      setFruits((prev) => prev.filter((f) => f.id !== id));
    },
    [phase, loseLife],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    if (gridSize.width === 0) return;

    const spawnMs = Math.max(
      MIN_SPAWN_MS,
      BASE_SPAWN_MS - (level - 1) * SPAWN_STEP_PER_LEVEL,
    );

    spawnRef.current = setInterval(() => {
      const targetZone =
        ZONE_LIST[Math.floor(Math.random() * ZONE_LIST.length)];
      const isBomb = Math.random() < Math.min(0.35, 0.18 + level * 0.015);
      const emoji = isBomb
        ? "💣"
        : FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];

      const trajectory = getThrowTrajectory(
        targetZone,
        gridSize.width,
        gridSize.height,
      );

      setFruits((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          emoji,
          isBomb,
          zone: targetZone,
          currentZone: ZONES.DOWN,
          trajectory,
          sliced: false,
        },
      ]);
    }, spawnMs);

    return () => clearInterval(spawnRef.current);
  }, [phase, level, gridSize.width, gridSize.height]);

  const catchMs = Math.max(
    MIN_CATCH_MS,
    BASE_CATCH_MS - (level - 1) * CATCH_STEP_PER_LEVEL,
  );

  const goToMenu = () => router.push("/gamelist");

  const selectFocused = () => {
    if (phase === "menu") {
      if (focusedId === "start") return startGame();
      if (focusedId === "back") return goToMenu();
      return;
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
    onUp: () =>
      phase === "playing" ? triggerZoneSlash(ZONES.UP) : moveMenuFocus("up"),
    onDown: () =>
      phase === "playing"
        ? triggerZoneSlash(ZONES.DOWN)
        : moveMenuFocus("down"),
    onLeft: () =>
      phase === "playing"
        ? triggerZoneSlash(ZONES.LEFT)
        : moveMenuFocus("left"),
    onRight: () =>
      phase === "playing"
        ? triggerZoneSlash(ZONES.RIGHT)
        : moveMenuFocus("right"),
    onSelect: selectFocused,
  });

  if (phase === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.menuCard}
          >
            <Text style={styles.title}>Fruit Cutter Zone</Text>
            <Text style={styles.subtitle}>
              Slash Up/Down/Left/Right the instant a fruit enters that zone.
              Avoid bombs!
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
      <View style={styles.hud}>
        <Pressable onPress={goToMenu} style={styles.backBtn}>
          <Text style={styles.hudText}>← Exit</Text>
        </Pressable>
        <Text style={styles.hudText}>Score: {score}</Text>
        <Text style={[styles.hudText, { color: "#facc15" }]}>Lv {level}</Text>
        <Text style={styles.hudText}>{"❤️".repeat(Math.max(0, lives))}</Text>
      </View>

      {showLevelUp && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.levelUpBanner}
        >
          <Text style={styles.levelUpText}>LEVEL {level}!</Text>
        </Animated.View>
      )}

      <View
        style={styles.gridContainer}
        onLayout={(e) =>
          setGridSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        <Zone
          label="▲ UP ▲"
          isActive={activeZoneSlash === ZONES.UP}
          baseColor="rgba(99, 102, 241, 0.08)"
          style={styles.zoneUp}
          onPress={() => triggerZoneSlash(ZONES.UP)}
        />

        <View style={styles.middleRow}>
          <Zone
            label="◄ LEFT"
            isActive={activeZoneSlash === ZONES.LEFT}
            baseColor="rgba(16, 185, 129, 0.08)"
            style={styles.zoneLeft}
            onPress={() => triggerZoneSlash(ZONES.LEFT)}
          />
          <Zone
            label="RIGHT ►"
            isActive={activeZoneSlash === ZONES.RIGHT}
            baseColor="rgba(245, 158, 11, 0.08)"
            style={styles.zoneRight}
            onPress={() => triggerZoneSlash(ZONES.RIGHT)}
          />
        </View>

        <Zone
          label="▼ DOWN ▼"
          isActive={activeZoneSlash === ZONES.DOWN}
          baseColor="rgba(239, 68, 68, 0.08)"
          style={styles.zoneDown}
          onPress={() => triggerZoneSlash(ZONES.DOWN)}
        />

        {gridSize.width > 0 &&
          fruits.map((fruit) => (
            <ZoneFruit
              key={fruit.id}
              fruit={fruit}
              catchMs={catchMs}
              onZoneUpdate={handleFruitZoneUpdate}
              onExit={handleFruitExit}
            />
          ))}
      </View>
    </SafeAreaView>
  );
}

function Zone({ label, isActive, baseColor, style, onPress }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 50 }),
        withTiming(1, { duration: 60 }),
      );
      glow.value = withSequence(
        withTiming(1, { duration: 40 }),
        withTiming(0, { duration: 100 }),
      );
    } else {
      scale.value = 1;
      glow.value = 0;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      glow.value,
      [0, 1],
      [baseColor, "rgba(255,255,255,0.35)"],
    ),
    borderColor: interpolateColor(
      glow.value,
      [0, 1],
      ["rgba(255,255,255,0.08)", "#ffffff"],
    ),
  }));

  return (
    <Pressable onPress={onPress} style={style}>
      <Animated.View style={[styles.zone, animatedStyle]}>
        <Text style={styles.zoneLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ZoneFruit({ fruit, catchMs, onZoneUpdate, onExit }) {
  const { trajectory } = fruit;
  const translateX = useSharedValue(trajectory.startX);
  const translateY = useSharedValue(trajectory.startY);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  const exitedRef = useRef(false);

  const doExit = useCallback(
    (sliced) => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      scale.value = withTiming(sliced ? 1.4 : 0.6, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(onExit)(fruit.id, sliced, fruit.isBomb);
      });
    },
    [fruit.id, fruit.isBomb, onExit],
  );

  useEffect(() => {
    translateX.value = withTiming(
      trajectory.targetX,
      { duration: catchMs * 0.8, easing: Easing.linear },
      () => {
        translateX.value = withTiming(trajectory.endX, {
          duration: catchMs * 0.8,
          easing: Easing.linear,
        });
      },
    );

    translateY.value = withTiming(
      trajectory.apexY,
      { duration: catchMs * 0.8, easing: Easing.out(Easing.quad) },
      () => {
        runOnJS(onZoneUpdate)(fruit.id, fruit.zone);

        translateY.value = withTiming(
          trajectory.endY,
          { duration: catchMs * 0.8, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) {
              runOnJS(doExit)(false);
            }
          },
        );
      },
    );

    rotation.value = withTiming(360, {
      duration: catchMs * 1.6,
      easing: Easing.linear,
    });
  }, []);

  useEffect(() => {
    if (fruit.sliced) doExit(true);
  }, [fruit.sliced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.fruit, animatedStyle]} pointerEvents="none">
      <Text style={styles.fruitEmoji}>{fruit.sliced ? "💥" : fruit.emoji}</Text>
    </Animated.View>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
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
  },
  hudText: { color: "#F8FAFC", fontSize: 15, fontWeight: "800" },
  backBtn: { paddingRight: 6 },
  levelUpBanner: {
    position: "absolute",
    top: "42%",
    alignSelf: "center",
    backgroundColor: "rgba(250,204,21,0.15)",
    borderColor: "#facc15",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 8,
    zIndex: 30,
  },
  levelUpText: { color: "#facc15", fontWeight: "900", letterSpacing: 1 },
  gridContainer: { flex: 1, position: "relative" },
  zone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 4,
  },
  zoneUp: { height: "25%" },
  middleRow: { height: "50%", flexDirection: "row" },
  zoneLeft: { flex: 1 },
  zoneRight: { flex: 1 },
  zoneDown: { height: "25%" },
  zoneLabel: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  fruit: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FRUIT_SIZE,
    height: FRUIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  fruitEmoji: { fontSize: 44 },
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
