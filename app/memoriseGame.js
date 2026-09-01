/**
 * Simon-Says memory game — phone, tablet, and TV (Android TV / Fire TV) from
 * ONE codebase.
 *
 * Layout: the 4 pads sit in a DIAMOND — one per cardinal direction (top /
 * right / bottom / left) — so they spatially match a D-pad/remote 1:1.
 * Pressing "up" moves focus toward the top pad, "right" toward the right
 * pad, etc. This replaces the old 2x2 grid, which didn't map cleanly onto
 * 4-directional input.
 *
 * Animation: back to react-native-reanimated (spring physics on the UI
 * thread — noticeably snappier/bouncier than JS-thread Animated, and this
 * project's babel-preset-expo/install issues are now sorted).
 *
 * IMPORTANT BUG FIX vs. earlier versions: activation-flash and focus-scale
 * used to animate the SAME shared value independently, so when a pad was
 * both focused and flashing, the two springs fought each other and the
 * bounce mostly cancelled out. Fixed by giving each its own shared value
 * and multiplying them together in the final transform.
 *
 * ─── PROJECT SETUP ─────────────────────────────────────────────────────────
 * 1) npx expo install react-native-reanimated expo-audio
 * 2) No manual Babel plugin needed — babel-preset-expo auto-configures the
 *    Reanimated/Worklets transform for Expo-managed projects. Keep
 *    babel.config.js as just:
 *      module.exports = function (api) {
 *        api.cache(true);
 *        return { presets: ['babel-preset-expo'] };
 *      };
 * ───────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAudioPlayer } from "expo-audio";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav.js";

// One pad per cardinal direction — matches D-pad physically.
const PAD_LAYOUT = {
  top: { id: "green", base: "#1DB954", glow: "#7CFFB2" },
  right: { id: "red", base: "#E63946", glow: "#FF9B9B" },
  bottom: { id: "yellow", base: "#F2B705", glow: "#FFE083" },
  left: { id: "blue", base: "#2979FF", glow: "#9DC4FF" },
};
const GAME_COLORS = Object.values(PAD_LAYOUT);

// Instant snap-back with a tight, fast micro-bounce
const BOUNCE_SPRING = {
  damping: 22, // High damping kills the long bounce/oscillation immediately
  stiffness: 500, // Extremely high tension for an instant reaction
  mass: 0.3, // Ultra-light mass so it accelerates and locks in instantly
};

// Instant focus/return configuration
const FOCUS_SPRING = {
  damping: 25,
  stiffness: 600,
  mass: 0.2,
};

// Focus graphs — diamond layout, so directions map the way they look.
const MENU_MAP = {
  back: { down: "start" },
  start: { up: "back" },
};
const GAME_MAP = {
  back: { right: "reset", down: "green" },
  reset: { left: "back", down: "green" },
  green: { up: "back", left: "blue", right: "red", down: "yellow" },
  blue: { up: "back", right: "green", down: "yellow" },
  red: { up: "reset", left: "green", down: "yellow" },
  yellow: { up: "green", left: "blue", right: "red" },
};

export default function App() {
  const [gameSequence, setGameSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [level, setLevel] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [focusedId, setFocusedId] = useState("start");

  const navigation = useNavigation();
  const timeoutRef = useRef(null);
  const { width, height } = useWindowDimensions();

  const isLargeScreen = Platform.isTV || width >= 1024;
  const boardSize = isLargeScreen
    ? Math.min(640, height * 0.58)
    : Math.min(320, width * 0.85);
  const buttonSize = boardSize / 3 - (isLargeScreen ? 20 : 14);
  const fontScale = isLargeScreen ? 1.6 : 1;

  const currentMap = gameStarted ? GAME_MAP : MENU_MAP;
  const defaultFocus = gameStarted ? "green" : "start";

  useEffect(() => {
    setFocusedId(defaultFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);

  // ---- Sound ----
  const clickPlayer = useAudioPlayer(require("../assets/music/click.mp3"));
  const nextPlayer = useAudioPlayer(require("../assets/music/next.mp3"));
  const gameoverPlayer = useAudioPlayer(
    require("../assets/music/gameover.mp3"),
  );

  const playSound = useCallback((player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      // Never let a missing/unloaded sound block gameplay.
    }
  }, []);

  const startGame = () => {
    resetGame();
    setGameStarted(true);
    nextRound();
  };

  const resetGame = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setGameSequence([]);
    setUserSequence([]);
    setLevel(0);
    setGameStarted(false);
    setActiveColor(null);
  };

  const nextRound = () => {
    setUserSequence([]);
    setLevel((prevLevel) => prevLevel + 1);
    const randomColor =
      GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].id;
    setGameSequence((prevSequence) => [...prevSequence, randomColor]);
  };

  const handleColorPress = (colorId) => {
    if (!gameStarted) return;

    playSound(clickPlayer);
    setUserSequence((prevSequence) => {
      const newSequence = [...prevSequence, colorId];

      if (
        newSequence[newSequence.length - 1] !==
        gameSequence[newSequence.length - 1]
      ) {
        playSound(gameoverPlayer);
        Alert.alert("Game Over", "try again");
        setGameStarted(false);
        return prevSequence;
      }

      if (newSequence.length === gameSequence.length) {
        playSound(nextPlayer);
        timeoutRef.current = setTimeout(nextRound, 1000);
      }

      return newSequence;
    });
  };

  useEffect(() => {
    if (!gameStarted || gameSequence.length === 0) return;

    let cancelled = false;

    const playSequence = async () => {
      for (const colorId of gameSequence) {
        await new Promise((r) => setTimeout(r, 550));
        if (cancelled) return;

        setActiveColor(colorId);
        playSound(clickPlayer);

        await new Promise((r) => setTimeout(r, 350));
        if (cancelled) return;

        setActiveColor(null);
      }
    };

    playSequence();

    return () => {
      cancelled = true;
      setActiveColor(null);
    };
  }, [gameSequence, gameStarted]);

  const goBackToMenu = () => {
    resetGame();
    navigation.navigate("gamelist");
  };

  const selectFocused = () => {
    const id = focusedId ?? defaultFocus;
    if (!gameStarted) {
      if (id === "back") return goBackToMenu();
      if (id === "start") return startGame();
      return;
    }
    if (id === "back") return goBackToMenu();
    if (id === "reset") return resetGame();
    return handleColorPress(id);
  };

  const moveFocus = (direction) => {
    const id = focusedId ?? defaultFocus;
    const next = currentMap[id]?.[direction];
    if (next) setFocusedId(next);
  };

  useControllerNav({
    onUp: () => moveFocus("up"),
    onDown: () => moveFocus("down"),
    onLeft: () => moveFocus("left"),
    onRight: () => moveFocus("right"),
    onSelect: selectFocused,
  });

  return (
    <View style={styles.container}>
      {!gameStarted ? (
        <MenuScreen
          isLargeScreen={isLargeScreen}
          fontScale={fontScale}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          onStart={startGame}
          onBack={goBackToMenu}
        />
      ) : (
        <GameScreen
          boardSize={boardSize}
          buttonSize={buttonSize}
          fontScale={fontScale}
          level={level}
          activeColor={activeColor}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          onColorPress={handleColorPress}
          onReset={resetGame}
          onBack={goBackToMenu}
        />
      )}
    </View>
  );
}

/* ─────────────────────────── Menu screen ─────────────────────────── */

function MenuScreen({
  isLargeScreen,
  fontScale,
  focusedId,
  setFocusedId,
  onStart,
  onBack,
}) {
  return (
    <>
      <Image
        source={require("../assets/images/color.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.menuContainer}>
        <Animated.View entering={FadeIn.duration(400)}>
          <FocusablePad
            id="back"
            label="Back to Menu"
            variant="secondary"
            fontScale={fontScale}
            isFocused={focusedId === "back"}
            onFocusId={setFocusedId}
            onPress={onBack}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={[
            styles.rulesContainer,
            isLargeScreen && styles.rulesContainerLarge,
          ]}
        >
          <Text style={[styles.rulesTitle, { fontSize: 22 * fontScale }]}>
            Game Rules:
          </Text>
          <Text style={[styles.rulesText, { fontSize: 16 * fontScale }]}>
            1. Watch the sequence of lights carefully.
          </Text>
          <Text style={[styles.rulesText, { fontSize: 16 * fontScale }]}>
            2. Repeat the sequence by selecting the pads in the same order.
          </Text>
          <Text style={[styles.rulesText, { fontSize: 16 * fontScale }]}>
            3. The sequence gets longer after each round.
          </Text>
          <Text style={[styles.rulesText, { fontSize: 16 * fontScale }]}>
            4. Pick the wrong pad and the game is over!
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <FocusablePad
            id="start"
            label="Start Game"
            variant="primary"
            fontScale={fontScale}
            isFocused={focusedId === "start"}
            onFocusId={setFocusedId}
            onPress={onStart}
          />
        </Animated.View>
      </View>
    </>
  );
}

/* ─────────────────────────── Game screen (diamond layout) ─────────────────────────── */

function GameScreen({
  boardSize,
  buttonSize,
  fontScale,
  level,
  activeColor,
  focusedId,
  setFocusedId,
  onColorPress,
  onReset,
  onBack,
}) {
  const cell = boardSize / 3;

  return (
    <View style={styles.gameContainer}>
      <View style={styles.topBar}>
        <FocusablePad
          id="back"
          label="Back to Menu"
          variant="secondary"
          fontScale={fontScale}
          isFocused={focusedId === "back"}
          onFocusId={setFocusedId}
          onPress={onBack}
        />
        <FocusablePad
          id="reset"
          label="Reset Game"
          variant="danger"
          fontScale={fontScale}
          isFocused={focusedId === "reset"}
          onFocusId={setFocusedId}
          onPress={onReset}
        />
      </View>

      <LevelBadge level={level} fontScale={fontScale} />

      <View style={[styles.board, { width: boardSize, height: boardSize }]}>
        <View style={[styles.boardRow, { height: cell }]}>
          <View style={{ width: cell }} />
          <GamePad
            color={PAD_LAYOUT.top}
            size={buttonSize}
            isActive={activeColor === PAD_LAYOUT.top.id}
            isFocused={focusedId === PAD_LAYOUT.top.id}
            onFocusId={setFocusedId}
            onPress={() => onColorPress(PAD_LAYOUT.top.id)}
          />
          <View style={{ width: cell }} />
        </View>

        <View style={[styles.boardRow, { height: cell }]}>
          <GamePad
            color={PAD_LAYOUT.left}
            size={buttonSize}
            isActive={activeColor === PAD_LAYOUT.left.id}
            isFocused={focusedId === PAD_LAYOUT.left.id}
            onFocusId={setFocusedId}
            onPress={() => onColorPress(PAD_LAYOUT.left.id)}
          />
          <View style={{ width: cell }} />
          <GamePad
            color={PAD_LAYOUT.right}
            size={buttonSize}
            isActive={activeColor === PAD_LAYOUT.right.id}
            isFocused={focusedId === PAD_LAYOUT.right.id}
            onFocusId={setFocusedId}
            onPress={() => onColorPress(PAD_LAYOUT.right.id)}
          />
        </View>

        <View style={[styles.boardRow, { height: cell }]}>
          <View style={{ width: cell }} />
          <GamePad
            color={PAD_LAYOUT.bottom}
            size={buttonSize}
            isActive={activeColor === PAD_LAYOUT.bottom.id}
            isFocused={focusedId === PAD_LAYOUT.bottom.id}
            onFocusId={setFocusedId}
            onPress={() => onColorPress(PAD_LAYOUT.bottom.id)}
          />
          <View style={{ width: cell }} />
        </View>
      </View>
    </View>
  );
}

/* ───────────────── Level badge (bounce on every level change) ───────────────── */

function LevelBadge({ level, fontScale }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return; // Prevent ghost animation
    }

    scale.value = 0.72;
    opacity.value = 0.2;

    scale.value = withSpring(1, {
      damping: 6,
      stiffness: 240,
      mass: 0.45,
    });

    opacity.value = withTiming(1, { duration: 180 });
  }, [level]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.levelBadge, animatedStyle]}>
      <Text style={[styles.levelText, { fontSize: 28 * fontScale }]}>
        Level {level}
      </Text>
    </Animated.View>
  );
}

/* ───────────────── Game pad — separate shared values for flash vs. focus ───────────────── */

function GamePad({ color, size, isActive, isFocused, onFocusId, onPress }) {
  // Two INDEPENDENT scales, multiplied together in the final transform.
  // This is the fix: flashing and focusing no longer fight over one value.
  const flashScale = useSharedValue(1);
  const focusScale = useSharedValue(1);
  const glow = useSharedValue(0);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    if (!isActive) return;

    // Cancel any previous animation and restart from 1
    cancelAnimation(flashScale);
    cancelAnimation(glow);

    flashScale.value = 1;
    glow.value = 0;

    flashScale.value = withSequence(
      withSpring(1.22, BOUNCE_SPRING),
      withSpring(1, BOUNCE_SPRING),
    );

    glow.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 180 }),
    );
  }, [isActive]);

  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value * focusScale.value }],
    shadowOpacity: 0.35 + glow.value * 0.55 + focusAnim.value * 0.25,
    shadowRadius: 10 + glow.value * 24 + focusAnim.value * 12,
    elevation: 6 + glow.value * 16 + focusAnim.value * 10,
    borderColor: focusAnim.value > 0.05 ? "#ffffff" : "transparent",
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(color.id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.pad,
          animatedStyle,
          {
            width: size,
            height: size,
            backgroundColor: color.base,
            shadowColor: color.glow,
          },
        ]}
      />
    </Pressable>
  );
}

/* ─────────────────────────── Reusable focusable button ─────────────────────────── */

function FocusablePad({
  id,
  label,
  variant = "primary",
  fontScale = 1,
  isFocused,
  onFocusId,
  onPress,
}) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.25 + focusAnim.value * 0.45,
    shadowRadius: 6 + focusAnim.value * 14,
    elevation: 4 + focusAnim.value * 10,
    borderColor: focusAnim.value > 0.05 ? "#ffffff" : "transparent",
  }));

  const variantStyle =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "danger"
        ? styles.btnDanger
        : styles.btnSecondary;

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
    >
      <Animated.View style={[styles.btnBase, variantStyle, animatedStyle]}>
        <Text style={[styles.btnText, { fontSize: 18 * fontScale }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#120318",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  menuContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: "6%", // TV-safe overscan margin
  },
  gameContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    paddingHorizontal: "6%",
    paddingTop: "4%",
  },
  topBar: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  levelBadge: {
    marginVertical: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
  },
  levelText: {
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  board: {
    justifyContent: "center",
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pad: {
    borderRadius: 20,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  rulesContainer: {
    padding: 20,
    backgroundColor: "rgba(234, 209, 240, 0.12)",
    borderRadius: 14,
    width: "90%",
    maxWidth: 520,
  },
  rulesContainerLarge: {
    maxWidth: 720,
    padding: 32,
  },
  rulesTitle: {
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  rulesText: {
    color: "#e6d9ea",
    marginVertical: 5,
  },
  btnBase: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "#ffffff",
  },
  btnPrimary: { backgroundColor: "#3d0532" },
  btnSecondary: { backgroundColor: "#4a2153" },
  btnDanger: { backgroundColor: "#800313" },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});
