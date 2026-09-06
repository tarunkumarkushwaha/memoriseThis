import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolateColor,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useControllerNav } from "../hooks/useControllerNav.js";

const HIGH_SCORE_KEY = "simon_highscore";

const PAD_LAYOUT = {
  top: { id: "green", base: "#1DB954", glow: "#7CFFB2" },
  right: { id: "red", base: "#E63946", glow: "#FF9B9B" },
  bottom: { id: "yellow", base: "#F2B705", glow: "#FFE083" },
  left: { id: "blue", base: "#2979FF", glow: "#9DC4FF" },
};
const GAME_COLORS = Object.values(PAD_LAYOUT);
const COLOR_IDS = new Set(GAME_COLORS.map((c) => c.id));

const BOUNCE_SPRING = { damping: 22, stiffness: 500, mass: 0.3 };
const FOCUS_SPRING = { damping: 25, stiffness: 600, mass: 0.2 };

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
const GAME_OVER_MAP = {
  playAgain: { right: "backToMenu" },
  backToMenu: { left: "playAgain" },
};

export default function App() {
  const [phase, setPhase] = useState("menu"); // menu | playing | over
  const [gameSequence, setGameSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [level, setLevel] = useState(0);
  const [activeColor, setActiveColor] = useState(null);
  const [pressPulse, setPressPulse] = useState({ id: null, key: 0 });
  const [focusedId, setFocusedId] = useState("start");
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const router = useRouter();
  const timeoutRef = useRef(null);
  const { width, height } = useWindowDimensions();

  const isLargeScreen = Platform.isTV || width >= 1024;
  const boardSize = isLargeScreen
    ? Math.min(640, height * 0.58)
    : Math.min(320, width * 0.85);
  const buttonSize = boardSize / 3 - (isLargeScreen ? 20 : 14);
  const fontScale = isLargeScreen ? 1.6 : 1;

  const currentMap =
    phase === "playing"
      ? GAME_MAP
      : phase === "menu"
        ? MENU_MAP
        : GAME_OVER_MAP;
  const defaultFocus =
    phase === "playing" ? "green" : phase === "menu" ? "start" : "playAgain";

  useEffect(() => {
    setFocusedId(defaultFocus);
  }, [phase]);

  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then((v) => {
        if (v) setHighScore(parseInt(v, 10) || 0);
      })
      .catch(() => {});
  }, []);

  const clickPlayer = useAudioPlayer(require("../assets/music/click.mp3"));
  const nextPlayer = useAudioPlayer(require("../assets/music/next.mp3"));
  const gameoverPlayer = useAudioPlayer(require("../assets/music/lose1.mp3"));

  const playSound = useCallback((player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {}
  }, []);

  const clearState = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setGameSequence([]);
    setUserSequence([]);
    setLevel(0);
    setActiveColor(null);
    setPressPulse({ id: null, key: 0 });
  };

  const startGame = () => {
    clearState();
    setIsNewHighScore(false);
    setPhase("playing");
    nextRound();
  };

  const resetGame = () => {
    clearState();
    setPhase("menu");
  };

  const nextRound = () => {
    setUserSequence([]);
    setLevel((prevLevel) => prevLevel + 1);
    const randomColor =
      GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].id;
    setGameSequence((prevSequence) => [...prevSequence, randomColor]);
  };

  const endGame = useCallback(
    (finalScore) => {
      setPhase("over");
      if (finalScore > highScore) {
        setHighScore(finalScore);
        setIsNewHighScore(true);
        AsyncStorage.setItem(HIGH_SCORE_KEY, String(finalScore)).catch(
          () => {},
        );
      } else {
        setIsNewHighScore(false);
      }
    },
    [highScore],
  );

  const handleColorPress = (colorId) => {
    if (phase !== "playing") return;
    setPressPulse((p) => ({ id: colorId, key: p.key + 1 }));
    playSound(clickPlayer);

    setUserSequence((prevSequence) => {
      const newSequence = [...prevSequence, colorId];

      if (
        newSequence[newSequence.length - 1] !==
        gameSequence[newSequence.length - 1]
      ) {
        playSound(gameoverPlayer);
        setTimeout(() => endGame(Math.max(0, level - 1)), 320);
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
    if (phase !== "playing" || gameSequence.length === 0) return;

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
  }, [gameSequence, phase]);

  const goBackToMenu = () => {
    clearState();
    router.push("/gamelist");
  };

  const selectFocused = () => {
    const id = focusedId ?? defaultFocus;
    if (phase === "menu") {
      if (id === "back") return goBackToMenu();
      if (id === "start") return startGame();
      return;
    }
    if (phase === "over") {
      if (id === "playAgain") return startGame();
      if (id === "backToMenu") return resetGame();
      return;
    }
    if (id === "back") return goBackToMenu();
    if (id === "reset") return resetGame();
    return handleColorPress(id);
  };
  const handleDirection = (direction) => {
    const id = focusedId ?? defaultFocus;
    const next = currentMap[id]?.[direction];
    if (!next) return;
    setFocusedId(next);
    if (phase === "playing" && COLOR_IDS.has(next)) {
      handleColorPress(next);
    }
  };

  useControllerNav({
    onUp: () => handleDirection("up"),
    onDown: () => handleDirection("down"),
    onLeft: () => handleDirection("left"),
    onRight: () => handleDirection("right"),
    onSelect: selectFocused,
  });

  return (
    <View style={styles.container}>
      {phase === "menu" && (
        <MenuScreen
          isLargeScreen={isLargeScreen}
          fontScale={fontScale}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          highScore={highScore}
          onStart={startGame}
          onBack={goBackToMenu}
        />
      )}
      {phase === "playing" && (
        <GameScreen
          boardSize={boardSize}
          buttonSize={buttonSize}
          fontScale={fontScale}
          level={level}
          activeColor={activeColor}
          pressPulse={pressPulse}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          onColorPress={handleColorPress}
          onReset={resetGame}
          onBack={goBackToMenu}
        />
      )}
      {phase === "over" && (
        <GameOverScreen
          fontScale={fontScale}
          score={Math.max(0, level - 1)}
          highScore={highScore}
          isNewHighScore={isNewHighScore}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          onPlayAgain={startGame}
          onBackToMenu={resetGame}
        />
      )}
    </View>
  );
}

function MenuScreen({
  isLargeScreen,
  fontScale,
  focusedId,
  setFocusedId,
  highScore,
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

        <Text style={[styles.highScoreText, { fontSize: 14 * fontScale }]}>
          High Score: {highScore}
        </Text>

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

function GameOverScreen({
  fontScale,
  score,
  highScore,
  isNewHighScore,
  focusedId,
  setFocusedId,
  onPlayAgain,
  onBackToMenu,
}) {
  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.gameOverCard}>
      <Text
        style={[styles.rulesTitle, { fontSize: 28 * fontScale, color: "#fff" }]}
      >
        Game Over
      </Text>

      {isNewHighScore && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.newRecordBadge}
        >
          <Text style={[styles.newRecordText, { fontSize: 14 * fontScale }]}>
            NEW HIGH SCORE!
          </Text>
        </Animated.View>
      )}

      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreBlockLabel, { fontSize: 13 * fontScale }]}>
            Your Score
          </Text>
          <Text style={[styles.scoreBlockValue, { fontSize: 34 * fontScale }]}>
            {score}
          </Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreBlockLabel, { fontSize: 13 * fontScale }]}>
            High Score
          </Text>
          <Text
            style={[
              styles.scoreBlockValue,
              { fontSize: 34 * fontScale, color: "#facc15" },
            ]}
          >
            {highScore}
          </Text>
        </View>
      </View>

      <View style={styles.gameOverButtonRow}>
        <FocusablePad
          id="playAgain"
          label="Play Again"
          variant="primary"
          fontScale={fontScale}
          isFocused={focusedId === "playAgain"}
          onFocusId={setFocusedId}
          onPress={onPlayAgain}
        />
        <FocusablePad
          id="backToMenu"
          label="Back to Menu"
          variant="secondary"
          fontScale={fontScale}
          isFocused={focusedId === "backToMenu"}
          onFocusId={setFocusedId}
          onPress={onBackToMenu}
        />
      </View>
    </Animated.View>
  );
}

function GameScreen({
  boardSize,
  buttonSize,
  fontScale,
  level,
  activeColor,
  pressPulse,
  focusedId,
  setFocusedId,
  onColorPress,
  onReset,
  onBack,
}) {
  const cell = boardSize / 3;
  const pressKeyFor = (colorId) =>
    pressPulse.id === colorId ? pressPulse.key : 0;

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
            pressKey={pressKeyFor(PAD_LAYOUT.top.id)}
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
            pressKey={pressKeyFor(PAD_LAYOUT.left.id)}
            isFocused={focusedId === PAD_LAYOUT.left.id}
            onFocusId={setFocusedId}
            onPress={() => onColorPress(PAD_LAYOUT.left.id)}
          />
          <View style={{ width: cell }} />
          <GamePad
            color={PAD_LAYOUT.right}
            size={buttonSize}
            isActive={activeColor === PAD_LAYOUT.right.id}
            pressKey={pressKeyFor(PAD_LAYOUT.right.id)}
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
            pressKey={pressKeyFor(PAD_LAYOUT.bottom.id)}
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

function LevelBadge({ level, fontScale }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scale.value = 0.72;
    opacity.value = 0.2;
    scale.value = withSpring(1, { damping: 6, stiffness: 240, mass: 0.45 });
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

function GamePad({
  color,
  size,
  isActive,
  pressKey,
  isFocused,
  onFocusId,
  onPress,
}) {
  const flashScale = useSharedValue(1);
  const pressBounce = useSharedValue(1);
  const focusScale = useSharedValue(1);
  const glow = useSharedValue(0);
  const focusAnim = useSharedValue(0);

  // Sequence REPLAY flash (computer showing the pattern).
  useEffect(() => {
    if (!isActive) return;
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
    if (!pressKey) return;
    cancelAnimation(pressBounce);
    pressBounce.value = 1;
    pressBounce.value = withSequence(
      withSpring(1.22, BOUNCE_SPRING),
      withSpring(1, BOUNCE_SPRING),
    );
  }, [pressKey]);

  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flashScale.value * pressBounce.value * focusScale.value },
    ],
    shadowOpacity: 0.35 + glow.value * 0.55 + focusAnim.value * 0.25,
    shadowRadius: 10 + glow.value * 24 + focusAnim.value * 12,
    elevation: 6 + glow.value * 16 + focusAnim.value * 10,
    // interpolateColor, not a raw ternary — see header note.
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#ffffff"],
    ),
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

  const handlePress = () => {
    // Quick tap feedback for touch, using the same BOUNCE_SPRING as the
    // color pads for a consistent feel across the whole app.
    scale.value = withSequence(
      withSpring(0.9, BOUNCE_SPRING),
      withSpring(isFocused ? 1.08 : 1, BOUNCE_SPRING),
    );
    onPress();
  };

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.25 + focusAnim.value * 0.45,
    shadowRadius: 6 + focusAnim.value * 14,
    elevation: 4 + focusAnim.value * 10,
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#ffffff"],
    ),
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
      onPress={handlePress}
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
    paddingHorizontal: "6%",
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
  highScoreText: { color: "#facc15", fontWeight: "700" },
  gameOverCard: {
    alignItems: "center",
    marginVertical: "auto",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 28,
    width: "90%",
    maxWidth: 600,
  },
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
  scoreBlockValue: { color: "#f8fafc", fontWeight: "900", marginTop: 2 },
  gameOverButtonRow: { flexDirection: "row", gap: 12, marginTop: 10 },
});
