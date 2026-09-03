import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useAudioPlayer } from "expo-audio";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav.js";
import backgroundImageAsset from "../assets/images/gameboxUI.png";

const CHOICES = [
  { id: "rock", icon: "hand-rock", color: "#38bdf8", glow: "#7dd3fc" },
  { id: "paper", icon: "hand-paper", color: "#a78bfa", glow: "#c4b5fd" },
  { id: "scissors", icon: "hand-scissors", color: "#fb923c", glow: "#fdba74" },
];
const VALUES = { rock: -1, paper: 0, scissors: 1 };

const BOUNCE_SPRING = { damping: 7, stiffness: 220, mass: 0.5 };
const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

const WIN_SOUND_URI = require("../assets/music/win3.mp3");
const LOSE_SOUND_URI = require("../assets/music/lose1.mp3");
const FOCUS_MAP = {
  difficulty: { down: "rock" },
  rock: { up: "difficulty", right: "paper" },
  paper: { up: "difficulty", left: "rock", right: "scissors", down: "reset" },
  scissors: { up: "difficulty", left: "paper" },
  reset: { up: "paper", right: "back" },
  back: { up: "scissors", left: "reset" },
};

export default function RockPaperScissors() {
  const [result, setResult] = useState("");
  const [player, setPlayer] = useState("");
  const [computer, setComputer] = useState("");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ win: 0, lose: 0, draw: 0 });
  const [difficulty, setDifficulty] = useState("easy");
  const [focusedId, setFocusedId] = useState("rock");

  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Responsive scale factors
  const isTabletOrTV = width >= 768;
  const isTV = Platform.isTV || width >= 1200;
  const fontScale = isTV ? 1.4 : isTabletOrTV ? 1.2 : 1;

  const winPlayer = useAudioPlayer(WIN_SOUND_URI);
  const losePlayer = useAudioPlayer(LOSE_SOUND_URI);

  const playSound = useCallback((audioPlayer) => {
    try {
      audioPlayer.seekTo(0);
      audioPlayer.play();
    } catch (e) {
      // Audio fallback
    }
  }, []);

  const resetGame = () => {
    setResult("");
    setPlayer("");
    setComputer("");
    setScore({ win: 0, lose: 0, draw: 0 });
  };

  const biasedComputerChoice = (playerChoice) => {
    if (difficulty === "easy") {
      return CHOICES[Math.floor(Math.random() * 3)].id;
    }
    if (playerChoice === "rock") return "paper";
    if (playerChoice === "paper") return "scissors";
    return "rock";
  };

  const playGame = (choice) => {
    const computerChoice = biasedComputerChoice(choice);
    const resultValue = VALUES[choice] - VALUES[computerChoice];

    setPlayer(choice);
    setComputer(computerChoice);
    setRound((r) => r + 1);

    if (resultValue === 0) {
      setResult("Draw");
      setScore((s) => ({ ...s, draw: s.draw + 1 }));
    } else if (resultValue === 1 || resultValue === -2) {
      setResult("You Win");
      setScore((s) => ({ ...s, win: s.win + 1 }));
      playSound(winPlayer);
    } else {
      setResult("You Lose");
      setScore((s) => ({ ...s, lose: s.lose + 1 }));
      playSound(losePlayer);
    }
  };

  const goBackToMenu = () => navigation.navigate("gamelist");

  const selectFocused = () => {
    if (focusedId === "difficulty") {
      setDifficulty((d) => (d === "easy" ? "Danger" : "easy"));
    } else if (focusedId === "reset") {
      resetGame();
    } else if (focusedId === "back") {
      goBackToMenu();
    } else if (CHOICES.some((c) => c.id === focusedId)) {
      playGame(focusedId);
    }
  };

  const moveFocus = (direction) => {
    const next = FOCUS_MAP[focusedId]?.[direction];
    if (next) setFocusedId(next);
  };

  useControllerNav({
    onUp: () => moveFocus("up"),
    onDown: () => moveFocus("down"),
    onLeft: () => moveFocus("left"),
    onRight: () => moveFocus("right"),
    onSelect: selectFocused,
  });

  const playerChoiceMeta = CHOICES.find((c) => c.id === player);
  const computerChoiceMeta = CHOICES.find((c) => c.id === computer);
  const playerStatus =
    result === "You Win"
      ? "win"
      : result === "You Lose"
        ? "lose"
        : result
          ? "draw"
          : null;
  const computerStatus =
    result === "You Lose"
      ? "win"
      : result === "You Win"
        ? "lose"
        : result
          ? "draw"
          : null;

  return (
    <View style={styles.mainContainer}>
      <Image
        source={backgroundImageAsset}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.glassCard,
            {
              maxWidth: isTV ? 850 : isTabletOrTV ? 650 : "92%",
              padding: isTabletOrTV ? 15 : 5,
            },
          ]}
        >
          {/* Header Badge */}
          {/* <View style={styles.logoBadge}>
            <Text style={[styles.logoText, isTabletOrTV && styles.logoTextLarge]}>
              Play OTG
            </Text>
          </View> */}

          <Animated.Text
            entering={FadeIn.duration(400)}
            style={[styles.title, { fontSize: 20 * fontScale }]}
          >
            Rock Paper Scissors
          </Animated.Text>

          {/* Difficulty Segmented Toggle */}
          <DifficultyToggle
            difficulty={difficulty}
            fontScale={fontScale}
            isFocused={focusedId === "difficulty"}
            onFocusId={setFocusedId}
            onToggle={() =>
              setDifficulty((d) => (d === "easy" ? "Danger" : "easy"))
            }
          />

          {/* Choices Row */}
          <View style={styles.choicesRow}>
            {CHOICES.map((choice) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                fontScale={fontScale}
                isSelected={player === choice.id}
                isFocused={focusedId === choice.id}
                onFocusId={setFocusedId}
                onPress={() => playGame(choice.id)}
              />
            ))}
          </View>

          {/* Battle Arena Reveal */}
          {result !== "" && (
            <Animated.View
              entering={FadeInDown.duration(350)}
              style={styles.arena}
            >
              <View style={styles.arenaSide}>
                <RevealIcon
                  meta={playerChoiceMeta}
                  status={playerStatus}
                  roundKey={round}
                  fontScale={fontScale}
                />
                <Text style={[styles.arenaLabel, { fontSize: 13 * fontScale }]}>
                  You
                </Text>
              </View>

              <Text style={[styles.vsText, { fontSize: 22 * fontScale }]}>
                VS
              </Text>

              <View style={styles.arenaSide}>
                <RevealIcon
                  meta={computerChoiceMeta}
                  status={computerStatus}
                  roundKey={round}
                  fontScale={fontScale}
                />
                <Text style={[styles.arenaLabel, { fontSize: 13 * fontScale }]}>
                  Computer
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Result Chip */}
          {result !== "" && (
            <Animated.View
              key={round}
              entering={FadeIn.duration(250)}
              style={[
                styles.resultChip,
                result === "You Win" && styles.resultChipWin,
                result === "You Lose" && styles.resultChipLose,
                result === "Draw" && styles.resultChipDraw,
              ]}
            >
              <Text style={[styles.resultText, { fontSize: 18 * fontScale }]}>
                {result}
              </Text>
            </Animated.View>
          )}

          {/* Score Box */}
          <View style={styles.scoreBox}>
            <ScorePill
              label="Win"
              value={score.win}
              color="#22c55e"
              fontScale={fontScale}
            />
            <ScorePill
              label="Lose"
              value={score.lose}
              color="#ef4444"
              fontScale={fontScale}
            />
            <ScorePill
              label="Draw"
              value={score.draw}
              color="#facc15"
              fontScale={fontScale}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonGroup}>
            <FocusableButton
              id="reset"
              label="Reset Game"
              variant="primary"
              fontScale={fontScale}
              isFocused={focusedId === "reset"}
              onFocusId={setFocusedId}
              onPress={resetGame}
            />
            <FocusableButton
              id="back"
              label="Back to Menu"
              variant="secondary"
              fontScale={fontScale}
              isFocused={focusedId === "back"}
              onFocusId={setFocusedId}
              onPress={goBackToMenu}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────── Difficulty segmented toggle ─────────────────────────── */

function DifficultyToggle({
  difficulty,
  fontScale,
  isFocused,
  onFocusId,
  onToggle,
}) {
  const slide = useSharedValue(difficulty === "easy" ? 0 : 1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    slide.value = withSpring(difficulty === "easy" ? 0 : 1, FOCUS_SPRING);
  }, [difficulty]);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * 108 }],
    backgroundColor: slide.value > 0.5 ? "#ef4444" : "#6366f1",
  }));

  const trackStyle = useAnimatedStyle(() => ({
    borderColor:
      focusAnim.value > 0.05 ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: focusAnim.value > 0.05 ? 1.04 : 1 }],
    shadowOpacity: 0.2 + focusAnim.value * 0.6,
    elevation: 3 + focusAnim.value * 8,
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId("difficulty")}
      onBlur={() => onFocusId(null)}
      onPress={onToggle}
    >
      <Animated.View style={[styles.diffTrack, trackStyle]}>
        <Animated.View style={[styles.diffPill, pillStyle]} />
        <View style={styles.diffLabelRow}>
          <Text style={[styles.diffLabel, { fontSize: 13 * fontScale }]}>
            EASY
          </Text>
          <Text style={[styles.diffLabel, { fontSize: 13 * fontScale }]}>
            DANGER
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Choice card (rock / paper / scissors) ─────────────────────────── */

function ChoiceCard({
  choice,
  fontScale,
  isSelected,
  isFocused,
  onFocusId,
  onPress,
}) {
  const pressScale = useSharedValue(1);
  const focusScale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  const handlePress = () => {
    pressScale.value = withSequence(
      withSpring(0.85, BOUNCE_SPRING),
      withSpring(1, BOUNCE_SPRING),
    );
    onPress();
  };

  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused || isSelected ? 1 : 0, FOCUS_SPRING);
  }, [isFocused, isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * focusScale.value }],
    borderColor: isFocused
      ? "#FFFFFF"
      : focusAnim.value > 0.05
        ? choice.glow
        : "rgba(255, 255, 255, 0.1)",
    shadowOpacity: 0.25 + focusAnim.value * 0.55,
    shadowRadius: 8 + focusAnim.value * 16,
    elevation: 4 + focusAnim.value * 10,
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(choice.id)}
      onBlur={() => onFocusId(null)}
      onPress={handlePress}
    >
      <Animated.View
        style={[styles.card, animatedStyle, { shadowColor: choice.glow }]}
      >
        <FontAwesome5
          name={choice.icon}
          size={36 * fontScale}
          color={choice.color}
        />
        <Text style={[styles.label, { fontSize: 13 * fontScale }]}>
          {choice.id}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Battle-reveal icon ─────────────────────────── */

function RevealIcon({ meta, status, roundKey, fontScale }) {
  const scale = useSharedValue(0.5);
  const shakeX = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.5;
    scale.value = withSpring(1, BOUNCE_SPRING);

    if (status === "win") {
      glow.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.6, { duration: 400 }),
      );
    } else if (status === "lose") {
      shakeX.value = withSequence(
        withTiming(10, { duration: 60 }),
        withTiming(-10, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [roundKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
    shadowOpacity: 0.3 + glow.value * 0.6,
    shadowRadius: 8 + glow.value * 22,
    elevation: 4 + glow.value * 14,
    borderColor:
      status === "win"
        ? "#22c55e"
        : status === "lose"
          ? "#ef4444"
          : "rgba(255, 255, 255, 0.2)",
  }));

  if (!meta) return null;

  return (
    <Animated.View
      style={[
        styles.revealCircle,
        animatedStyle,
        { shadowColor: status === "win" ? "#22c55e" : "#ef4444" },
      ]}
    >
      <FontAwesome5 name={meta.icon} size={32 * fontScale} color={meta.color} />
    </Animated.View>
  );
}

/* ─────────────────────────── Score pill ─────────────────────────── */

function ScorePill({ label, value, color, fontScale }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.25, BOUNCE_SPRING),
      withSpring(1, BOUNCE_SPRING),
    );
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.scorePill, animatedStyle, { borderColor: color }]}
    >
      <Text style={[styles.scoreLabel, { color, fontSize: 10 * fontScale }]}>
        {label}
      </Text>
      <Text style={[styles.scoreValue, { fontSize: 16 * fontScale }]}>
        {value}
      </Text>
    </Animated.View>
  );
}

/* ─────────────────────────── Reusable focusable button ─────────────────────────── */

function FocusableButton({
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
    scale.value = withSpring(isFocused ? 1.04 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: focusAnim.value > 0.05 ? "#FFFFFF" : "transparent",
    shadowOpacity: 0.2 + focusAnim.value * 0.6,
    shadowColor: "#FFFFFF",
    shadowRadius: 14,
    elevation: 3 + focusAnim.value * 8,
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
      style={{ width: "100%" }}
    >
      <Animated.View
        style={[
          styles.actionBtn,
          variant === "primary"
            ? styles.actionBtnPrimary
            : styles.actionBtnSecondary,
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
  mainContainer: {
    flex: 1,
    backgroundColor: "#060913",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 19, 0.45)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.5)",
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  logoTextLarge: {
    fontSize: 14,
    letterSpacing: 4,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  /* Difficulty Toggle Styles */
  diffTrack: {
    width: 220,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 3,
    justifyContent: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "#6366f1",
  },
  diffPill: {
    position: "absolute",
    width: 104,
    height: 34,
    borderRadius: 17,
    top: 2,
    left: 2,
  },
  diffLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  diffLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* Choices Row */
  choicesRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    width: 96,
    height: 110,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    color: "#cbd5e1",
    marginTop: 8,
    textTransform: "capitalize",
    fontWeight: "700",
  },

  /* Arena Reveal */
  arena: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 14,
  },
  arenaSide: {
    alignItems: "center",
    gap: 6,
  },
  arenaLabel: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  vsText: {
    color: "#64748b",
    fontWeight: "900",
    letterSpacing: 1,
  },
  revealCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
  },

  /* Results Chip */
  resultChip: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  resultChipWin: { backgroundColor: "rgba(34, 197, 94, 0.25)" },
  resultChipLose: { backgroundColor: "rgba(239, 68, 68, 0.25)" },
  resultChipDraw: { backgroundColor: "rgba(250, 204, 21, 0.25)" },
  resultText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* Scores Box */
  scoreBox: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  scorePill: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    minWidth: 70,
  },
  scoreLabel: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scoreValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 2,
  },

  /* Action Buttons */
  actionButtonGroup: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // width: "100%",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: "#6366f1",
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  actionBtnText: {
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
