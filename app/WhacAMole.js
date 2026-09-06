import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
  interpolateColor,
} from "react-native-reanimated";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { useControllerNav } from "../hooks/useControllerNav.js";
import Hole from "../components/Hole";
import AsyncStorage from "@react-native-async-storage/async-storage";
import backgroundImageAsset from "../assets/images/gameboxUI.png";

const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };
const BOUNCE_SPRING = { damping: 8, stiffness: 220, mass: 0.5 };
const HIGH_SCORE_KEY = "whacamole_highscore";

const SPEEDS = [
  { id: "dumb", label: "Dumb", speed: 1200 },
  { id: "ultra-easy", label: "Ultra Easy", speed: 1000 },
  { id: "easy", label: "Easy", speed: 850 },
  { id: "normal", label: "Normal", speed: 700 },
  { id: "medium", label: "Medium", speed: 600 },
  { id: "hard", label: "Hard", speed: 500 },
  { id: "very-hard", label: "Very Hard", speed: 400 },
  { id: "god", label: "God Level", speed: 280 },
];

const LAYOUTS = [
  // Cross layout: exactly 4 holes, one per D-pad direction. A direction
  // press hits DIRECTLY (see handleDirection below) rather than just
  // moving focus — matching a real remote 1:1.
  {
    id: "2x2",
    label: "2 × 2 (Remote)",
    size: 2,
    maxSimultaneous: 1,
    isCross: true,
  },
  { id: "3x3", label: "3 × 3", size: 3, maxSimultaneous: 2 },
  { id: "4x4", label: "4 × 4", size: 4, maxSimultaneous: 3 },
  { id: "5x5", label: "5 × 5", size: 5, maxSimultaneous: 4 },
];

const CROSS_POSITIONS = { up: 0, right: 1, down: 2, left: 3 };

const MENU_MAP = {
  back: { down: "speed" },
  speed: { up: "back", down: "layout" },
  layout: { up: "speed", down: "start" },
  start: { up: "layout" },
};

function buildGridMap(size) {
  const map = {};
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      map[idx] = {};
      if (c > 0) map[idx].left = idx - 1;
      if (c < size - 1) map[idx].right = idx + 1;
      if (r > 0) map[idx].up = idx - size;
      if (r < size - 1) map[idx].down = idx + size;
    }
  }
  return map;
}

const LEVEL_UP_EVERY = 5;
const MIN_SPEED_MS = 220;
const SPEED_STEP_PER_LEVEL = 35;

export default function WhacAMole() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isLarge = Platform.isTV || width >= 1000;
  const fontScale = isLarge ? 1.5 : 1;

  const [phase, setPhase] = useState("setup"); // setup | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeMoles, setActiveMoles] = useState([]);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const [focusedMenu, setFocusedMenu] = useState("start");
  const [focusedHole, setFocusedHole] = useState(0);
  const [focusedGameOver, setFocusedGameOver] = useState("playAgain");

  const [selectedSpeedIdx, setSelectedSpeedIdx] = useState(3);
  const [selectedLayoutIdx, setSelectedLayoutIdx] = useState(0);

  const selectedSpeed = SPEEDS[selectedSpeedIdx];
  const selectedLayout = LAYOUTS[selectedLayoutIdx];
  const gridSize = selectedLayout.size;
  const holeCount = gridSize * gridSize;

  const boardSize = isLarge
    ? Math.min(680, height * 0.6)
    : Math.min(340, width * 0.9);
  const holeSize = selectedLayout.isCross
    ? boardSize / 3 - (isLarge ? 20 : 14)
    : boardSize / gridSize - (isLarge ? 20 : 14);

  const gridMap = useMemo(() => buildGridMap(gridSize), [gridSize]);

  const spawnRef = useRef(null);
  const timerRef = useRef(null);
  const prevLevelRef = useRef(1);

  const hitPlayer = useAudioPlayer(require("../assets/music/click.mp3"));
  const missPlayer = useAudioPlayer(require("../assets/music/gameover.mp3"));
  const levelUpPlayer = useAudioPlayer(require("../assets/music/next.mp3"));

  const play = useCallback((player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {}
  }, []);

  // Load persisted high score once on mount.
  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then((v) => {
        if (v) setHighScore(parseInt(v, 10) || 0);
      })
      .catch(() => {});
  }, []);

  const clearGame = () => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    spawnRef.current = null;
    timerRef.current = null;
    setActiveMoles([]);
  };

  const startGame = () => {
    clearGame();
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setLevel(1);
    setIsNewHighScore(false);
    prevLevelRef.current = 1;
    setFocusedHole(Math.floor(holeCount / 2));
    setPhase("playing");
  };

  const backToMenu = () => {
    clearGame();
    setPhase("setup");
    setFocusedMenu("start");
  };

  const exitApp = () => {
    clearGame();
    router.back();;
  };

  const endGame = useCallback(
    (finalScore) => {
      clearGame();
      setPhase("over");
      setFocusedGameOver("playAgain");
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

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    const nextLevel = Math.floor(score / LEVEL_UP_EVERY) + 1;
    if (nextLevel !== level) setLevel(nextLevel);
  }, [score]);

  useEffect(() => {
    if (level > prevLevelRef.current && phase === "playing") {
      prevLevelRef.current = level;
      setShowLevelUp(true);
      play(levelUpPlayer);
      const t = setTimeout(() => setShowLevelUp(false), 900);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (phase !== "playing") return;
    const effectiveSpeed = Math.max(
      MIN_SPEED_MS,
      selectedSpeed.speed - (level - 1) * SPEED_STEP_PER_LEVEL,
    );
    const simultaneousCount = Math.min(
      1 + Math.floor((level - 1) / 3),
      selectedLayout.maxSimultaneous,
    );

    spawnRef.current = setInterval(() => {
      const picks = new Set();
      while (picks.size < simultaneousCount) {
        picks.add(Math.floor(Math.random() * holeCount));
      }
      setActiveMoles([...picks]);
    }, effectiveSpeed);

    return () => clearInterval(spawnRef.current);
  }, [phase, level, selectedSpeedIdx, gridSize]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) endGame(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (lives <= 0) endGame(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives]);
  const attemptHit = (index) => {
    if (phase !== "playing") return;
    if (activeMoles.includes(index)) {
      play(hitPlayer);
      setScore((s) => s + 1);
      setActiveMoles((prev) => prev.filter((i) => i !== index));
    } else {
      play(missPlayer);
      setLives((l) => Math.max(0, l - 1));
    }
  };

  const hit = () => attemptHit(focusedHole);

  const moveHole = (dir) => {
    const next = gridMap[focusedHole]?.[dir];
    if (next !== undefined) setFocusedHole(next);
  };
  const handleDirection = (dir) => {
    if (selectedLayout.isCross) {
      const target = CROSS_POSITIONS[dir];
      if (target === undefined) return;
      setFocusedHole(target);
      attemptHit(target);
      return;
    }
    moveHole(dir);
  };

  useControllerNav({
    onUp: () => {
      if (phase === "setup") {
        const n = MENU_MAP[focusedMenu]?.up;
        if (n) setFocusedMenu(n);
      } else if (phase === "playing") handleDirection("up");
    },
    onDown: () => {
      if (phase === "setup") {
        const n = MENU_MAP[focusedMenu]?.down;
        if (n) setFocusedMenu(n);
      } else if (phase === "playing") handleDirection("down");
    },
    onLeft: () => {
      if (phase === "setup") {
        if (focusedMenu === "speed")
          setSelectedSpeedIdx((i) => Math.max(0, i - 1));
        else if (focusedMenu === "layout")
          setSelectedLayoutIdx((i) => Math.max(0, i - 1));
      } else if (phase === "playing") handleDirection("left");
      else if (phase === "over") setFocusedGameOver("playAgain");
    },
    onRight: () => {
      if (phase === "setup") {
        if (focusedMenu === "speed")
          setSelectedSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1));
        else if (focusedMenu === "layout")
          setSelectedLayoutIdx((i) => Math.min(LAYOUTS.length - 1, i + 1));
      } else if (phase === "playing") handleDirection("right");
      else if (phase === "over") setFocusedGameOver("backToMenu");
    },
    onSelect: () => {
      if (phase === "setup") {
        if (focusedMenu === "back") return exitApp();
        if (focusedMenu === "start") return startGame();
        return;
      }
      if (phase === "playing") return hit();
      if (phase === "over") {
        if (focusedGameOver === "playAgain") return startGame();
        if (focusedGameOver === "backToMenu") return backToMenu();
      }
    },
  });

  if (phase === "setup") {
    return (
      <View style={styles.container}>
        <Image
          source={backgroundImageAsset}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.darkOverlay} />
        <Animated.View entering={FadeIn.duration(500)} style={styles.menu}>
          <Text style={[styles.title, { fontSize: 20 * fontScale }]}>
            Whac-a-Mole
          </Text>
          <Text style={[styles.subtitle, { fontSize: 14 * fontScale }]}>
            Hit the mole before it disappears!
          </Text>

          <MenuButton
            label="Back to Menu"
            fontScale={fontScale}
            focused={focusedMenu === "back"}
            onFocus={() => setFocusedMenu("back")}
            onPress={exitApp}
          />

          <OptionSelector
            label="Speed"
            fontScale={fontScale}
            options={SPEEDS}
            selectedIndex={selectedSpeedIdx}
            isFocused={focusedMenu === "speed"}
            onFocus={() => setFocusedMenu("speed")}
            onLeft={() => setSelectedSpeedIdx((i) => Math.max(0, i - 1))}
            onRight={() =>
              setSelectedSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))
            }
          />

          <OptionSelector
            label="Layout"
            fontScale={fontScale}
            options={LAYOUTS}
            selectedIndex={selectedLayoutIdx}
            isFocused={focusedMenu === "layout"}
            onFocus={() => setFocusedMenu("layout")}
            onLeft={() => setSelectedLayoutIdx((i) => Math.max(0, i - 1))}
            onRight={() =>
              setSelectedLayoutIdx((i) => Math.min(LAYOUTS.length - 1, i + 1))
            }
          />

          {/* {selectedLayout.isCross && (
            <Text style={[styles.hint, { fontSize: 12 * fontScale }]}>
              Remote mode: D-pad directions hit directly — no select needed.
            </Text>
          )} */}

          <Text style={[styles.highScoreText, { fontSize: 13 * fontScale }]}>
            High Score: {highScore}
          </Text>

          <MenuButton
            label="Start Game"
            variant="primary"
            fontScale={fontScale}
            focused={focusedMenu === "start"}
            onFocus={() => setFocusedMenu("start")}
            onPress={startGame}
          />
        </Animated.View>
      </View>
    );
  }

  if (phase === "over") {
    return (
      <View style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(350)}
          style={styles.gameOverCard}
        >
          <Text style={[styles.title, { fontSize: 28 * fontScale }]}>
            Game Over
          </Text>

          {isNewHighScore && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.newRecordBadge}
            >
              <Text
                style={[styles.newRecordText, { fontSize: 14 * fontScale }]}
              >
                NEW HIGH SCORE!
              </Text>
            </Animated.View>
          )}

          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text
                style={[styles.scoreBlockLabel, { fontSize: 13 * fontScale }]}
              >
                Your Score
              </Text>
              <Text
                style={[styles.scoreBlockValue, { fontSize: 34 * fontScale }]}
              >
                {score}
              </Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text
                style={[styles.scoreBlockLabel, { fontSize: 13 * fontScale }]}
              >
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

          <Text style={[styles.levelReached, { fontSize: 14 * fontScale }]}>
            Reached Level {level}
          </Text>

          <View style={styles.gameOverButtonRow}>
            <MenuButton
              label="Play Again"
              variant="primary"
              fontScale={fontScale}
              focused={focusedGameOver === "playAgain"}
              onFocus={() => setFocusedGameOver("playAgain")}
              onPress={startGame}
            />
            <MenuButton
              label="Back to Menu"
              fontScale={fontScale}
              focused={focusedGameOver === "backToMenu"}
              onFocus={() => setFocusedGameOver("backToMenu")}
              onPress={backToMenu}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Stat label="Score" value={score} fontScale={fontScale} />
        <Stat
          label="Level"
          value={level}
          fontScale={fontScale}
          accent="#facc15"
        />
        <Stat
          label="Lives"
          value={"❤️".repeat(lives)}
          fontScale={fontScale}
          isEmoji
        />
        <Stat label="Time" value={`${timeLeft}s`} fontScale={fontScale} />
      </View>

      {showLevelUp && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.levelUpBanner}
        >
          <Text style={[styles.levelUpText, { fontSize: 20 * fontScale }]}>
            LEVEL {level}!
          </Text>
        </Animated.View>
      )}

      {selectedLayout.isCross ? (
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={[
            styles.board,
            styles.crossBoard,
            { width: boardSize, height: boardSize },
          ]}
        >
          {(() => {
            const cell = boardSize / 3;
            const holeProps = (index) => ({
              id: index,
              size: holeSize,
              isVisible: activeMoles.includes(index),
              isFocused: focusedHole === index,
              onFocusId: (id) => {
                if (id !== null) setFocusedHole(id);
              },
              onPress: () => attemptHit(index),
            });
            return (
              <>
                <View style={[styles.crossRow, { height: cell }]}>
                  <View style={{ width: cell }} />
                  <Hole key={0} {...holeProps(0)} />
                  <View style={{ width: cell }} />
                </View>
                <View style={[styles.crossRow, { height: cell }]}>
                  <Hole key={3} {...holeProps(3)} />
                  <View style={{ width: cell }} />
                  <Hole key={1} {...holeProps(1)} />
                </View>
                <View style={[styles.crossRow, { height: cell }]}>
                  <View style={{ width: cell }} />
                  <Hole key={2} {...holeProps(2)} />
                  <View style={{ width: cell }} />
                </View>
              </>
            );
          })()}
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={[styles.board, { width: boardSize, height: boardSize }]}
        >
          {Array.from({ length: holeCount }).map((_, index) => (
            <Hole
              key={index}
              id={index}
              size={holeSize}
              isVisible={activeMoles.includes(index)}
              isFocused={focusedHole === index}
              onFocusId={(id) => {
                if (id !== null) setFocusedHole(id);
              }}
              onPress={() => attemptHit(index)}
            />
          ))}
        </Animated.View>
      )}

      <Text style={[styles.tip, { fontSize: 13 * fontScale }]}>
        {selectedLayout.isCross
          ? "Use D-pad to whack directly"
          : "Use D-pad to move • OK to Whack"}
      </Text>
    </View>
  );
}

function Stat({ label, value, fontScale, accent, isEmoji }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { fontSize: 12 * fontScale }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          {
            fontSize: (isEmoji ? 16 : 20) * fontScale,
            color: accent || "#f8fafc",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MenuButton({
  label,
  variant = "secondary",
  fontScale,
  focused,
  onFocus,
  onPress,
}) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.06 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(focused ? 1 : 0, FOCUS_SPRING);
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // interpolateColor, not a raw ternary — see header note.
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#FFE45E"],
    ),
    shadowOpacity: focusAnim.value * 0.7,
    elevation: focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={onFocus} onPress={onPress}>
      <Animated.View
        style={[
          styles.menuButton,
          variant === "primary" && styles.menuButtonPrimary,
          animatedStyle,
        ]}
      >
        <Text style={[styles.menuText, { fontSize: 16 * fontScale }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function OptionSelector({
  label,
  fontScale,
  options,
  selectedIndex,
  isFocused,
  onFocus,
  onLeft,
  onRight,
}) {
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#FFE45E"],
    ),
    shadowOpacity: focusAnim.value * 0.7,
    elevation: focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={onFocus}>
      <Animated.View style={[styles.selectorRow, animatedStyle]}>
        <Text style={[styles.selectorLabel, { fontSize: 13 * fontScale }]}>
          {label}
        </Text>
        <View style={styles.selectorControls}>
          <Pressable
            focusable
            isTVSelectable
            hitSlop={10}
            onPress={onLeft}
            style={styles.selectorArrow}
          >
            <Text
              style={[styles.selectorArrowText, { fontSize: 16 * fontScale }]}
            >
              ‹
            </Text>
          </Pressable>
          <Text style={[styles.selectorValue, { fontSize: 15 * fontScale }]}>
            {options[selectedIndex].label}
          </Text>
          <Pressable
            focusable
            isTVSelectable
            hitSlop={10}
            onPress={onRight}
            style={styles.selectorArrow}
          >
            <Text
              style={[styles.selectorArrowText, { fontSize: 16 * fontScale }]}
            >
              ›
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#150a24",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  highScoreText:{color:"white"},
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
  menu: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: "6%",
    width: "100%",
    maxWidth: 420,
  },
  title: {
    fontWeight: "bold",
    color: "#FFE45E",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#c4b5fd",
    textAlign: "center",
    marginBottom: 6,
  },
  menuButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "#3b1d5c",
    shadowColor: "#FFE45E",
    shadowOffset: { width: 0, height: 0 },
    minWidth: 200,
    alignItems: "center",
  },
  menuButtonPrimary: {
    backgroundColor: "#5B21B6",
  },
  menuText: {
    color: "#f8fafc",
    fontWeight: "bold",
  },
  selectorRow: {
    width: "100%",
    minWidth: 260,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#FFE45E",
    shadowOffset: { width: 0, height: 0 },
    gap: 6,
  },
  selectorLabel: {
    color: "#c4b5fd",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  selectorControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3b1d5c",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorArrowText: {
    color: "#FFE45E",
    fontWeight: "bold",
  },
  selectorValue: {
    color: "#f8fafc",
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  hud: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 6,
  },
  stat: {
    alignItems: "center",
    minWidth: 56,
  },
  statLabel: {
    color: "#a78bfa",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: "bold",
    marginTop: 2,
  },
  levelUpBanner: {
    position: "absolute",
    top: "38%",
    backgroundColor: "rgba(250,204,21,0.15)",
    borderColor: "#facc15",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 8,
    zIndex: 10,
  },
  levelUpText: {
    color: "#facc15",
    fontWeight: "900",
    letterSpacing: 1,
  },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 8,
  },
  crossBoard: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  crossRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tip: {
    color: "#94a3b8",
    marginTop: 6,
  },
  gameOverCard: {
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 420,
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
  levelReached: { color: "#cbd5e1" },
  gameOverButtonRow: { flexDirection: "row", gap: 12, marginTop: 10 },
});
