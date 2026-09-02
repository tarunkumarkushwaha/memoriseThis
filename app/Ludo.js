import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ScrollView,
  Image,
} from "react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useAudioPlayer } from "expo-audio";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav.js";
import backgroundImageAsset from "../assets/images/dice.jpg";
import { LuComputer } from "react-icons/lu";
import { IoIosMan } from "react-icons/io";


const WIN_SOUND_URI =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_b8c9103636.mp3?filename=correct-83487.mp3";
const CAPTURE_SOUND_URI =
  "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative_beeps-6008.mp3";

const BOUNCE_SPRING = { damping: 8, stiffness: 200, mass: 0.5 };
const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };
const GLOBAL_PATH = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
];

const ALL_COLORS = ["red", "green", "yellow", "blue"];
const START_INDEX = { red: 1, green: 14, yellow: 27, blue: 40 };
const HOME_COLUMN = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  blue: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};
const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
const YARD_ORIGIN = {
  red: [0, 0],
  green: [0, 9],
  yellow: [9, 9],
  blue: [9, 0],
};
const SLOT_OFFSETS = [
  [1.5, 1.5],
  [1.5, 3.5],
  [3.5, 1.5],
  [3.5, 3.5],
];
const TOKEN_COLORS = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};
const YARD_TINT = {
  red: "rgba(239,68,68,0.2)",
  green: "rgba(34,197,94,0.2)",
  yellow: "rgba(234,179,8,0.2)",
  blue: "rgba(59,130,246,0.2)",
};

function buildColorPath(color) {
  const cells = [];
  const globalIdx = [];
  for (let p = 1; p <= 51; p++) {
    const idx = (START_INDEX[color] + p - 1) % 52;
    globalIdx.push(idx);
    cells.push(GLOBAL_PATH[idx]);
  }
  HOME_COLUMN[color].forEach((c) => cells.push(c));
  return { cells, globalIdx };
}
const PLAYER_PATH = Object.fromEntries(
  ALL_COLORS.map((c) => [c, buildColorPath(c)]),
);

function cellForToken(color, position) {
  if (position === 0) return null;
  return PLAYER_PATH[color].cells[position - 1];
}
function globalIndexForToken(color, position) {
  if (position < 1 || position > 51) return null;
  return PLAYER_PATH[color].globalIdx[position - 1];
}
function yardSlot(color, tokenIdx) {
  const [oy, ox] = YARD_ORIGIN[color];
  const [dy, dx] = SLOT_OFFSETS[tokenIdx];
  return [oy + dy, ox + dx];
}

function makeInitialTokens(activeColors) {
  const tokens = {};
  activeColors.forEach((color) => {
    tokens[color] = [0, 0, 0, 0];
  });
  return tokens;
}

function getValidMoves(tokens, color, roll) {
  const moves = [];
  tokens[color].forEach((pos, idx) => {
    if (pos === 0 && roll === 6) moves.push(idx);
    else if (pos > 0 && pos + roll <= 57) moves.push(idx);
  });
  return moves;
}

function applyMove(tokens, color, tokenIdx, roll) {
  const next = { ...tokens, [color]: [...tokens[color]] };
  const oldPos = next[color][tokenIdx];
  const newPos = oldPos === 0 ? 1 : oldPos + roll;
  next[color][tokenIdx] = newPos;

  let captured = false;
  if (newPos >= 1 && newPos <= 51) {
    const myGlobal = globalIndexForToken(color, newPos);
    if (!SAFE_INDICES.has(myGlobal)) {
      Object.keys(next).forEach((otherColor) => {
        if (otherColor === color) return;
        next[otherColor] = next[otherColor].map((otherPos) => {
          if (otherPos < 1 || otherPos > 51) return otherPos;
          if (globalIndexForToken(otherColor, otherPos) === myGlobal) {
            captured = true;
            return 0;
          }
          return otherPos;
        });
      });
    }
  }
  return { tokens: next, captured, reachedHome: newPos === 57 };
}

export default function LudoGame() {
  const [phase, setPhase] = useState("setup");
  const [numPlayers, setNumPlayers] = useState(4);
  const [humanColor, setHumanColor] = useState("red");
  const [playerTypes, setPlayerTypes] = useState([
    "human",
    "cpu",
    "cpu",
    "cpu",
  ]);

  const [tokens, setTokens] = useState({});
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [sixStreak, setSixStreak] = useState(0);
  const [movableTokens, setMovableTokens] = useState([]);
  const [focusedId, setFocusedId] = useState("setup-start");
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");

  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isTabletOrTV = Platform.isTV || width >= 768;
  const isTV = Platform.isTV || width >= 1200;
  const fontScale = isTV ? 1.3 : isTabletOrTV ? 1.1 : 0.9;
  const maxAvailableSize = Math.min(width * 0.92, height * 0.58);
  const CELL = Math.floor(maxAvailableSize / 15);
  const BOARD = CELL * 15;
  const activeColors = useMemo(() => {
    const remaining = ALL_COLORS.filter((c) => c !== humanColor);
    return [humanColor, ...remaining].slice(0, numPlayers);
  }, [humanColor, numPlayers]);

  const currentColor = activeColors[currentPlayerIdx] || activeColors[0];
  const isCurrentCPU = playerTypes[currentPlayerIdx] === "cpu";

  const rollTimer = useRef(null);
  const winSound = useAudioPlayer({ uri: WIN_SOUND_URI });
  const captureSound = useAudioPlayer({ uri: CAPTURE_SOUND_URI });

  const playSound = useCallback((p) => {
    try {
      p.seekTo(0);
      p.play();
    } catch (e) {}
  }, []);
  useEffect(() => {
    setPlayerTypes((prev) => {
      const updated = [...prev];
      while (updated.length < numPlayers) updated.push("cpu");
      return updated.slice(0, numPlayers);
    });
  }, [numPlayers]);

  useEffect(
    () => () => rollTimer.current && clearInterval(rollTimer.current),
    [],
  );

  const startGame = () => {
    const initToks = makeInitialTokens(activeColors);
    setTokens(initToks);
    setCurrentPlayerIdx(0);
    setSixStreak(0);
    setWinner(null);
    setMessage("");
    setPhase("awaitingRoll");
    setFocusedId("roll");
  };

  const goBackToMenu = () => navigation.navigate("gamelist");

  const advanceTurn = (bonus) => {
    if (bonus) {
      setPhase("awaitingRoll");
      setFocusedId("roll");
      return;
    }
    setSixStreak(0);
    setCurrentPlayerIdx((i) => (i + 1) % numPlayers);
    setPhase("awaitingRoll");
    setFocusedId("roll");
  };

  const resolveMove = (color, tokenIdx) => {
    const roll = diceValue;
    const {
      tokens: nextTokens,
      captured,
      reachedHome,
    } = applyMove(tokens, color, tokenIdx, roll);
    setTokens(nextTokens);
    if (captured) playSound(captureSound);
    if (reachedHome) playSound(winSound);

    const finishedAll = nextTokens[color].every((p) => p === 57);
    if (finishedAll) {
      setWinner(color);
      setPhase("gameOver");
      playSound(winSound);
      return;
    }

    const bonus = roll === 6 || captured || reachedHome;
    setMovableTokens([]);
    advanceTurn(bonus);
  };

  const doMoveOrAI = (color, tokenIdx) => {
    setPhase("moving");
    setTimeout(() => resolveMove(color, tokenIdx), 300);
  };

  const rollDice = () => {
    if (phase !== "awaitingRoll") return;
    setPhase("rolling");
    setMessage("");
    let ticks = 0;
    rollTimer.current = setInterval(() => {
      setDiceValue(1 + Math.floor(Math.random() * 6));
      ticks++;
      if (ticks >= 7) {
        clearInterval(rollTimer.current);
        const finalRoll = 1 + Math.floor(Math.random() * 6);
        setDiceValue(finalRoll);
        settleRoll(finalRoll);
      }
    }, 70);
  };

  const settleRoll = (roll) => {
    const nextStreak = roll === 6 ? sixStreak + 1 : 0;
    setSixStreak(nextStreak);

    if (nextStreak >= 3) {
      setMessage("Three 6s — Turn forfeited!");
      setTimeout(() => advanceTurn(false), 800);
      return;
    }

    const moves = getValidMoves(tokens, currentColor, roll);
    if (moves.length === 0) {
      setMessage("No valid moves");
      setTimeout(() => advanceTurn(roll === 6), 800);
      return;
    }
    if (moves.length === 1) {
      doMoveOrAI(currentColor, moves[0]);
      return;
    }
    setMovableTokens(moves);
    setFocusedId(`token-${moves[0]}`);
    setPhase("awaitingTokenSelect");
  };

  const pickAIMove = (color, roll, moves) => {
    const scored = moves.map((idx) => {
      const { captured, reachedHome } = applyMove(tokens, color, idx, roll);
      const pos = tokens[color][idx];
      let score = pos;
      if (captured) score += 1000;
      if (reachedHome) score += 500;
      if (pos === 0) score += 200;
      return { idx, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].idx;
  };

  useEffect(() => {
    if (!isCurrentCPU || phase === "setup" || phase === "gameOver") return;

    if (phase === "awaitingRoll") {
      const t = setTimeout(rollDice, 750);
      return () => clearTimeout(t);
    }
    if (phase === "awaitingTokenSelect") {
      const t = setTimeout(() => {
        const idx = pickAIMove(currentColor, diceValue, movableTokens);
        doMoveOrAI(currentColor, idx);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [phase, currentPlayerIdx, isCurrentCPU]);

  const selectFocused = () => {
    if (phase === "setup") {
      if (focusedId === "setup-start") startGame();
      else if (focusedId === "back") goBackToMenu();
      return;
    }
    if (isCurrentCPU) return;

    if (focusedId === "roll") rollDice();
    else if (focusedId === "back") goBackToMenu();
    else if (focusedId === "play-again") startGame();
    else if (typeof focusedId === "string" && focusedId.startsWith("token-")) {
      const idx = Number(focusedId.split("-")[1]);
      doMoveOrAI(currentColor, idx);
    }
  };

  const moveFocus = (direction) => {
    if (phase === "setup") {
      const setupGraph = {
        "count-2": { right: "count-3", down: "color-red" },
        "count-3": { left: "count-2", right: "count-4", down: "color-green" },
        "count-4": { left: "count-3", down: "color-yellow" },
        "color-red": { up: "count-2", right: "color-green", down: "seat-0" },
        "color-green": {
          up: "count-3",
          left: "color-red",
          right: "color-yellow",
          down: "seat-1",
        },
        "color-yellow": {
          up: "count-4",
          left: "color-green",
          right: "color-blue",
          down: "seat-2",
        },
        "color-blue": { up: "count-4", left: "color-yellow", down: "seat-3" },
        "seat-0": { up: "color-red", right: "seat-1", down: "setup-start" },
        "seat-1": {
          up: "color-green",
          left: "seat-0",
          right: "seat-2",
          down: "setup-start",
        },
        "seat-2": {
          up: "color-yellow",
          left: "seat-1",
          right: "seat-3",
          down: "setup-start",
        },
        "seat-3": { up: "color-blue", left: "seat-2", down: "setup-start" },
        "setup-start": { up: "seat-0", down: "back" },
        back: { up: "setup-start" },
      };
      const next = setupGraph[focusedId]?.[direction];
      if (next) setFocusedId(next);
      return;
    }

    if (
      phase === "awaitingTokenSelect" &&
      (direction === "left" || direction === "right")
    ) {
      const i = movableTokens.indexOf(Number(String(focusedId).split("-")[1]));
      if (i !== -1) {
        const nextI =
          direction === "right"
            ? (i + 1) % movableTokens.length
            : (i - 1 + movableTokens.length) % movableTokens.length;
        setFocusedId(`token-${movableTokens[nextI]}`);
      }
    }
  };

  useControllerNav({
    onUp: () => moveFocus("up"),
    onDown: () => moveFocus("down"),
    onLeft: () => moveFocus("left"),
    onRight: () => moveFocus("right"),
    onSelect: selectFocused,
  });

  return (
    <View style={styles.mainContainer}>
      <Image
        source={backgroundImageAsset}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {phase === "setup" ? (
          <View
            style={[
              styles.glassCard,
              {
                maxWidth: isTabletOrTV ? 600 : "92%",
                padding: isTabletOrTV ? 28 : 18,
              },
            ]}
          >
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontSize: 11 * fontScale }]}>
                GAME BOX SETUP
              </Text>
            </View>

            <Text style={[styles.title, { fontSize: 24 * fontScale }]}>
              Ludo Customisation
            </Text>

            <Text
              style={[styles.setupSectionLabel, { fontSize: 13 * fontScale }]}
            >
              1. PLAYER COUNT
            </Text>
            <View style={styles.optionRow}>
              {[2, 3, 4].map((count) => (
                <PressableBtn
                  key={count}
                  id={`count-${count}`}
                  icon={""}
                  label={`${count} Players`}
                  active={numPlayers === count}
                  isFocused={focusedId === `count-${count}`}
                  fontScale={fontScale}
                  onFocusId={setFocusedId}
                  onPress={() => setNumPlayers(count)}
                />
              ))}
            </View>

            <Text
              style={[styles.setupSectionLabel, { fontSize: 13 * fontScale }]}
            >
              2. YOUR COLOR (P1)
            </Text>
            <View style={styles.optionRow}>
              {ALL_COLORS.map((color) => (
                <PressableBtn
                  key={color}
                  id={`color-${color}`}
                  label={color.toUpperCase()}
                  icon={""}
                  active={humanColor === color}
                  accentColor={TOKEN_COLORS[color]}
                  isFocused={focusedId === `color-${color}`}
                  fontScale={fontScale}
                  onFocusId={setFocusedId}
                  onPress={() => setHumanColor(color)}
                />
              ))}
            </View>

            <Text
              style={[styles.setupSectionLabel, { fontSize: 13 * fontScale }]}
            >
              3. SEAT TYPES
            </Text>
            <View style={styles.seatsGrid}>
              {activeColors.map((color, idx) => (
                <View
                  key={color}
                  style={[
                    styles.seatCard,
                    { borderColor: TOKEN_COLORS[color] },
                  ]}
                >
                  <Text
                    style={[
                      styles.seatColorLabel,
                      { color: TOKEN_COLORS[color], fontSize: 12 * fontScale },
                    ]}
                  >
                    {color.toUpperCase()}
                  </Text>
                  <PressableBtn
                    id={`seat-${idx}`}
                    label={playerTypes[idx] === "human" ? "Human" : `CPU`}
                    icon={playerTypes[idx] === "human" ? <IoIosMan /> : <LuComputer size={18} color="#fff" />}
                    active={playerTypes[idx] === "human"}
                    isFocused={focusedId === `seat-${idx}`}
                    fontScale={fontScale * 0.9}
                    onFocusId={setFocusedId}
                    onPress={() => {
                      setPlayerTypes((prev) => {
                        const copy = [...prev];
                        copy[idx] = copy[idx] === "human" ? "cpu" : "human";
                        return copy;
                      });
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={styles.setupActionGroup}>
              <ActionButton
                id="setup-start"
                label="Start Match"
                fontScale={fontScale}
                isFocused={focusedId === "setup-start"}
                onFocusId={setFocusedId}
                onPress={startGame}
              />
              <ActionButton
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
        ) : (
          <View
            style={[
              styles.glassCard,
              {
                maxWidth: isTabletOrTV ? 720 : "95%",
                padding: isTabletOrTV ? 20 : 12,
              },
            ]}
          >
            <TurnBanner
              color={currentColor}
              isCPU={isCurrentCPU}
              phase={phase}
              message={message}
              fontScale={fontScale}
            />
            <View
              style={[
                styles.boardWrapper,
                { width: BOARD + 8, height: BOARD + 8 },
              ]}
            >
              <View style={[styles.board, { width: BOARD, height: BOARD }]}>
                <BoardCells cell={CELL} activeColors={activeColors} />
                {activeColors.map((color) =>
                  tokens[color]?.map((pos, idx) => (
                    <Token
                      key={`${color}-${idx}`}
                      color={color}
                      position={pos}
                      tokenIdx={idx}
                      cell={CELL}
                      allTokens={tokens}
                      activeColors={activeColors}
                      isMovable={
                        color === currentColor &&
                        !isCurrentCPU &&
                        movableTokens.includes(idx) &&
                        phase === "awaitingTokenSelect"
                      }
                      isFocused={
                        focusedId === `token-${idx}` && color === currentColor
                      }
                      onPress={() => {
                        if (
                          color === currentColor &&
                          !isCurrentCPU &&
                          movableTokens.includes(idx) &&
                          phase === "awaitingTokenSelect"
                        ) {
                          doMoveOrAI(color, idx);
                        }
                      }}
                    />
                  )),
                )}
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <Pressable
                focusable
                isTVSelectable
                disabled={phase !== "awaitingRoll" || isCurrentCPU}
                onFocus={() => setFocusedId("roll")}
                onBlur={() => setFocusedId(null)}
                onPress={rollDice}
              >
                <DiceFace
                  value={diceValue}
                  isFocused={focusedId === "roll"}
                  isRolling={phase === "rolling"}
                  disabled={phase !== "awaitingRoll" || isCurrentCPU}
                  fontScale={fontScale}
                />
              </Pressable>

              {phase === "gameOver" && winner && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.winnerBox}
                >
                  <Text
                    style={[
                      styles.winnerText,
                      { color: TOKEN_COLORS[winner], fontSize: 18 * fontScale },
                    ]}
                  >
                    {winner.toUpperCase()} WINS!
                  </Text>
                  <ActionButton
                    id="play-again"
                    label="Play Again"
                    fontScale={fontScale}
                    isFocused={focusedId === "play-again"}
                    onFocusId={setFocusedId}
                    onPress={startGame}
                  />
                </Animated.View>
              )}

              <ActionButton
                id="back"
                label="Menu"
                variant="secondary"
                fontScale={fontScale}
                isFocused={focusedId === "back"}
                onFocusId={setFocusedId}
                onPress={goBackToMenu}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BoardCells({ cell, activeColors }) {
  const items = [];

  ALL_COLORS.forEach((color) => {
    const [oy, ox] = YARD_ORIGIN[color];
    const isActive = activeColors.includes(color);

    items.push(
      <View
        key={`yard-${color}`}
        style={{
          position: "absolute",
          left: ox * cell,
          top: oy * cell,
          width: 6 * cell,
          height: 6 * cell,
          backgroundColor: isActive
            ? YARD_TINT[color]
            : "rgba(255,255,255,0.02)",
          borderWidth: 2,
          borderColor: isActive
            ? TOKEN_COLORS[color]
            : "rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: cell * 0.4,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        />
      </View>,
    );
  });

  GLOBAL_PATH.forEach(([r, c], i) => {
    const isSafe = SAFE_INDICES.has(i);
    const starColor =
      i === 1
        ? "#ef4444"
        : i === 14
          ? "#22c55e"
          : i === 27
            ? "#eab308"
            : i === 40
              ? "#3b82f6"
              : "#f59e0b";

    items.push(
      <View
        key={`path-${i}`}
        style={{
          position: "absolute",
          left: c * cell,
          top: r * cell,
          width: cell,
          height: cell,
          backgroundColor: isSafe
            ? "rgba(253, 224, 71, 0.25)"
            : "rgba(248, 250, 252, 0.92)",
          borderWidth: 0.5,
          borderColor: "rgba(15, 23, 42, 0.25)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isSafe && (
          <FontAwesome5
            name="star"
            size={cell * 0.45}
            color={starColor}
            solid
          />
        )}
      </View>,
    );
  });

  ALL_COLORS.forEach((color) => {
    HOME_COLUMN[color].forEach(([r, c], i) => {
      items.push(
        <View
          key={`home-${color}-${i}`}
          style={{
            position: "absolute",
            left: c * cell,
            top: r * cell,
            width: cell,
            height: cell,
            backgroundColor: TOKEN_COLORS[color],
            opacity: 0.85,
            borderWidth: 0.5,
            borderColor: "rgba(0,0,0,0.3)",
          }}
        />,
      );
    });
  });

  items.push(
    <View
      key="center"
      style={{
        position: "absolute",
        left: 6 * cell,
        top: 6 * cell,
        width: 3 * cell,
        height: 3 * cell,
        backgroundColor: "#0f172a",
        borderWidth: 2,
        borderColor: "#facc15",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}
    >
      <FontAwesome5 name="crown" size={cell * 1.1} color="#facc15" solid />
    </View>,
  );

  return <>{items}</>;
}

function Token({
  color,
  position,
  tokenIdx,
  cell,
  allTokens,
  activeColors,
  isMovable,
  isFocused,
  onPress,
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const arcY = useSharedValue(0);

  const size = cell * 0.72;

  const stackOffset = useMemo(() => {
    if (position === 0) return { dx: 0, dy: 0 };
    let matchingCount = 0;
    let myRank = 0;

    activeColors.forEach((c) => {
      allTokens[c]?.forEach((pos, idx) => {
        if (pos === position && pos > 0) {
          if (c === color && idx === tokenIdx) myRank = matchingCount;
          matchingCount++;
        }
      });
    });

    if (matchingCount <= 1) return { dx: 0, dy: 0 };
    const shift = cell * 0.12;
    return {
      dx: (myRank % 2) * shift - shift / 2,
      dy: Math.floor(myRank / 2) * shift - shift / 2,
    };
  }, [position, color, tokenIdx, allTokens, activeColors, cell]);

  useEffect(() => {
    const [row, col] =
      position === 0
        ? yardSlot(color, tokenIdx)
        : cellForToken(color, position) || yardSlot(color, tokenIdx);

    const targetX = col * cell + (cell - size) / 2 + stackOffset.dx;
    const targetY = row * cell + (cell - size) / 2 + stackOffset.dy;

    arcY.value = withSequence(
      withTiming(-14, { duration: 140 }),
      withTiming(0, { duration: 160 }),
    );
    x.value = withTiming(targetX, { duration: 300 });
    y.value = withTiming(targetY, { duration: 300 });
  }, [position, stackOffset]);

  useEffect(() => {
    scale.value = withSpring(isMovable || isFocused ? 1.3 : 1, FOCUS_SPRING);
  }, [isMovable, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: size,
    height: size,
    transform: [{ translateY: arcY.value }, { scale: scale.value }],
    shadowOpacity: isMovable || isFocused ? 0.9 : 0.35,
    shadowRadius: isMovable || isFocused ? 10 : 3,
    elevation: isMovable || isFocused ? 10 : 3,
  }));

  return (
    <Pressable onPress={onPress} style={{ position: "absolute" }} hitSlop={6}>
      <Animated.View
        style={[
          styles.token,
          animatedStyle,
          {
            backgroundColor: TOKEN_COLORS[color],
            borderColor: isFocused ? "#ffffff" : "rgba(255,255,255,0.85)",
          },
        ]}
      >
        <View style={styles.tokenInnerDot} />
      </Animated.View>
    </Pressable>
  );
}

const DICE_FACES = [
  "dice-one",
  "dice-two",
  "dice-three",
  "dice-four",
  "dice-five",
  "dice-six",
];

function DiceFace({ value, isFocused, isRolling, disabled, fontScale }) {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    if (isRolling) {
      rotate.value = withTiming(rotate.value + 360, { duration: 550 });
    } else {
      scale.value = withSequence(
        withSpring(1.25, BOUNCE_SPRING),
        withSpring(1, BOUNCE_SPRING),
      );
    }
  }, [isRolling, value]);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }, { scale: scale.value }],
    borderColor: focusAnim.value > 0.05 ? "#ffffff" : "rgba(255,255,255,0.2)",
    shadowOpacity: 0.3 + focusAnim.value * 0.5,
    shadowColor: "#ffffff",
    elevation: 4 + focusAnim.value * 8,
  }));

  return (
    <Animated.View
      style={[styles.dice, animatedStyle, disabled && { opacity: 0.5 }]}
    >
      <FontAwesome5
        name={DICE_FACES[value - 1]}
        size={28 * fontScale}
        color="#0f172a"
        solid
      />
    </Animated.View>
  );
}

function TurnBanner({ color, isCPU, phase, message, fontScale }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.turnBanner, { borderColor: TOKEN_COLORS[color] }]}
    >
      <Text
        style={[
          styles.turnText,
          { color: TOKEN_COLORS[color], fontSize: 14 * fontScale },
        ]}
      >
        {color.toUpperCase()}'S TURN {isCPU ? "(CPU)" : ""}
      </Text>
      {!!message && (
        <Text style={[styles.turnMessage, { fontSize: 11 * fontScale }]}>
          {message}
        </Text>
      )}
      {phase === "awaitingTokenSelect" && !isCPU && (
        <Text style={[styles.turnMessage, { fontSize: 11 * fontScale }]}>
          Select a highlighted token
        </Text>
      )}
    </Animated.View>
  );
}

function PressableBtn({
  id,
  label,
  active,
  icon,
  accentColor,
  isFocused,
  fontScale,
  onFocusId,
  onPress,
}) {
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor:
      focusAnim.value > 0.05
        ? "#ffffff"
        : active
          ? accentColor || "#6366f1"
          : "rgba(255,255,255,0.15)",
    transform: [{ scale: focusAnim.value > 0.05 ? 1.05 : 1 }],
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
          styles.pressableBtn,
          active && {
            backgroundColor: accentColor || "rgba(99, 102, 241, 0.3)",
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.pressableBtnText, { fontSize: 12 * fontScale }]}>
          {icon} {label}
        </Text>
      </Animated.View>
    </Pressable>
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
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focusAnim.value > 0.05 ? "#ffffff" : "transparent",
    transform: [{ scale: focusAnim.value > 0.05 ? 1.04 : 1 }],
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={() => onFocusId(id)}
      onBlur={() => onFocusId(null)}
      onPress={onPress}
      style={{ width: "auto", padding: 10 }}
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
        <Text style={[styles.actionBtnText, { fontSize: 14 * fontScale }]}>
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
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 19, 0.55)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
  },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderRadius: 24,
    borderWidth: 1,
    // display:"flex",
    // justifyContent:"center",
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  badge: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.5)",
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  badgeText: {
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 2,
  },
  title: {
    color: "#ffffff",
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },

  /* Setup Screen Styles */
  setupSectionLabel: {
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  optionRow: {
    flexDirection: "row",
    alignItems:"center",
    justifyContent:"center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
    width: "100%",
  },
  seatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  seatCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    gap: 4,
  },
  seatColorLabel: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pressableBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pressableBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  setupActionGroup: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },

  turnBanner: {
    borderWidth: 2,
    height:70,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 12,
  },
  turnText: { fontWeight: "800", letterSpacing: 1 },
  turnMessage: { color: "#cbd5e1", marginTop: 2 },
  boardWrapper: {
    padding: 3,
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  board: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    overflow: "hidden",
  },
  token: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
  },
  tokenInnerDot: {
    width: "35%",
    height: "35%",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    gap: 12,
  },
  dice: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerBox: {
    alignItems: "center",
    gap: 6,
  },
  winnerText: { fontWeight: "900", letterSpacing: 1 },
  actionBtn: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: { backgroundColor: "#6366f1" },
  actionBtnSecondary: { backgroundColor: "rgba(255, 255, 255, 0.08)" },
  actionBtnText: { fontWeight: "800", color: "#ffffff", textAlign: "center" },
});
