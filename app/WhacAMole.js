/**
 * Whac-a-Mole — rewritten for TV + real difficulty progression.
 *
 * Bugs fixed from the original:
 * - Difficulty never actually changed during a round: the spawn effect
 *   computed a `speed` value from `timeLeft` but then used
 *   `selectedSpeed.speed` in the setInterval instead — the computed value
 *   was dead code.
 * - That same effect re-ran every second (deps: [started, timeLeft]),
 *   tearing down and rebuilding the spawn interval every tick regardless
 *   of the configured speed, making actual mole timing unpredictable.
 * - The Speed Selector was unreachable by D-pad: MENU_MAP only linked
 *   back<->start (skipping over it), and onLeft/onRight in
 *   useControllerNav did nothing at all while in the menu.
 * - GRID_MAP was hardcoded for exactly 9 holes, which is why a layout
 *   selector wasn't possible before — it's now generated for any NxN size.
 *
 * New: a Layout selector (3x3 / 4x4 / 5x5, bigger grids make sense on a
 * TV), a real Level system driven by score that actually speeds up spawns
 * and — at higher levels, on bigger grids — spawns more than one mole at
 * once, and TV-scaled fonts/sizing/safe margins throughout.
 *
 * Assumes Hole.js (the mole/hole visual, unchanged) lives at
 * '../components/Hole' — adjust the import path to match your project.
 *
 * ─── SETUP ─────────────────────────────────────────────────────────────────
 * npx expo install react-native-reanimated expo-audio
 * ───────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation } from '@react-navigation/native';
import { useControllerNav } from '../hooks/useControllerNav.js';
import Hole from '../components/Hole';

const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

const SPEEDS = [
  { id: 'easy', label: 'Easy', speed: 850 },
  { id: 'normal', label: 'Normal', speed: 700 },
  { id: 'hard', label: 'Hard', speed: 550 },
  { id: 'extreme', label: 'Extreme', speed: 400 },
];

const LAYOUTS = [
  // Cross layout: exactly 4 holes, one per D-pad direction. Unlike a plain
  // 2x2 square (where the diagonal hole would still need two presses),
  // pressing a direction jumps STRAIGHT to that hole — a true 1:1 match
  // with the physical remote, handled via CROSS_POSITIONS below.
  { id: '2x2', label: '2 × 2 (Remote)', size: 2, maxSimultaneous: 1, isCross: true },
  { id: '3x3', label: '3 × 3', size: 3, maxSimultaneous: 2 },
  { id: '4x4', label: '4 × 4', size: 4, maxSimultaneous: 3 },
  { id: '5x5', label: '5 × 5', size: 5, maxSimultaneous: 4 },
];

// Fixed hole-index assignment for the cross layout — top/right/bottom/left,
// matching a remote's up/right/down/left buttons directly.
const CROSS_POSITIONS = { up: 0, right: 1, down: 2, left: 3 };

const MENU_MAP = {
  back: { down: 'speed' },
  speed: { up: 'back', down: 'layout' },
  layout: { up: 'speed', down: 'start' },
  start: { up: 'layout' },
};

// Generates up/down/left/right neighbors for an arbitrary NxN grid —
// replaces the old hardcoded-for-9-holes GRID_MAP.
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

const LEVEL_UP_EVERY = 5; // score points per level
const MIN_SPEED_MS = 220;
const SPEED_STEP_PER_LEVEL = 35;

export default function WhacAMole() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const isLarge = Platform.isTV || width >= 1000;
  const fontScale = isLarge ? 1.5 : 1;

  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeMoles, setActiveMoles] = useState([]); // array of hole indices
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const [focusedMenu, setFocusedMenu] = useState('start');
  const [focusedHole, setFocusedHole] = useState(0);

  const [selectedSpeedIdx, setSelectedSpeedIdx] = useState(1); // Normal
  const [selectedLayoutIdx, setSelectedLayoutIdx] = useState(1); // 3x3 (index0 is the new 2x2 cross layout)

  const selectedSpeed = SPEEDS[selectedSpeedIdx];
  const selectedLayout = LAYOUTS[selectedLayoutIdx];
  const gridSize = selectedLayout.size;
  const holeCount = gridSize * gridSize;

  const boardSize = isLarge ? Math.min(680, height * 0.6) : Math.min(340, width * 0.9);
  const holeSize = selectedLayout.isCross
    ? boardSize / 3 - (isLarge ? 20 : 14) // cross uses a 3-cell-wide diamond, not gridSize
    : boardSize / gridSize - (isLarge ? 20 : 14);

  const gridMap = useMemo(() => buildGridMap(gridSize), [gridSize]);

  const spawnRef = useRef(null);
  const timerRef = useRef(null);
  const prevLevelRef = useRef(1);

  const hitPlayer = useAudioPlayer(require('../assets/music/click.mp3'));
  const missPlayer = useAudioPlayer(require('../assets/music/gameover.mp3'));
  const levelUpPlayer = useAudioPlayer(require('../assets/music/next.mp3'));

  const play = useCallback((player) => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {}
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
    prevLevelRef.current = 1;
    setFocusedHole(Math.floor(holeCount / 2));
    setStarted(true);
  };

  const backMenu = () => {
    clearGame();
    navigation.goBack();
  };

  // Round countdown.
  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [started]);

  // Level derives from score — this replaces the old dead timeLeft-based
  // "speed" calculation, and it's actually used below.
  useEffect(() => {
    const nextLevel = Math.floor(score / LEVEL_UP_EVERY) + 1;
    if (nextLevel !== level) setLevel(nextLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  useEffect(() => {
    if (level > prevLevelRef.current && started) {
      prevLevelRef.current = level;
      setShowLevelUp(true);
      play(levelUpPlayer);
      const t = setTimeout(() => setShowLevelUp(false), 900);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Spawn loop — depends only on [started, level, selectedSpeedIdx,
  // gridSize], NOT on timeLeft, so it no longer rebuilds every second.
  useEffect(() => {
    if (!started) return;

    const effectiveSpeed = Math.max(MIN_SPEED_MS, selectedSpeed.speed - (level - 1) * SPEED_STEP_PER_LEVEL);
    const simultaneousCount = Math.min(1 + Math.floor((level - 1) / 3), selectedLayout.maxSimultaneous);

    spawnRef.current = setInterval(() => {
      const picks = new Set();
      while (picks.size < simultaneousCount) {
        picks.add(Math.floor(Math.random() * holeCount));
      }
      setActiveMoles([...picks]);
    }, effectiveSpeed);

    return () => clearInterval(spawnRef.current);
  }, [started, level, selectedSpeedIdx, gridSize]);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      clearGame();
      setStarted(false);
      Alert.alert('Time Up!', `Final Score: ${score} — Level ${level}`);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (!started) return;
    if (lives <= 0) {
      clearGame();
      setStarted(false);
      Alert.alert('Game Over', `Score: ${score} — Level ${level}`);
    }
  }, [lives]);

  const hit = () => {
    if (!started) return;
    if (activeMoles.includes(focusedHole)) {
      play(hitPlayer);
      setScore((s) => s + 1);
      setActiveMoles((prev) => prev.filter((i) => i !== focusedHole));
    } else {
      play(missPlayer);
      setLives((l) => Math.max(0, l - 1));
    }
  };

  const moveHole = (dir) => {
    if (selectedLayout.isCross) {
      // Direct button-to-hole mapping — always jumps to that hole,
      // regardless of current focus, matching a real remote.
      const target = CROSS_POSITIONS[dir];
      if (target !== undefined) setFocusedHole(target);
      return;
    }
    const next = gridMap[focusedHole]?.[dir];
    if (next !== undefined) setFocusedHole(next);
  };

  useControllerNav({
    onUp: () => {
      if (!started) {
        const n = MENU_MAP[focusedMenu]?.up;
        if (n) setFocusedMenu(n);
      } else moveHole('up');
    },
    onDown: () => {
      if (!started) {
        const n = MENU_MAP[focusedMenu]?.down;
        if (n) setFocusedMenu(n);
      } else moveHole('down');
    },
    onLeft: () => {
      if (!started) {
        if (focusedMenu === 'speed') setSelectedSpeedIdx((i) => Math.max(0, i - 1));
        else if (focusedMenu === 'layout') setSelectedLayoutIdx((i) => Math.max(0, i - 1));
      } else moveHole('left');
    },
    onRight: () => {
      if (!started) {
        if (focusedMenu === 'speed') setSelectedSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1));
        else if (focusedMenu === 'layout') setSelectedLayoutIdx((i) => Math.min(LAYOUTS.length - 1, i + 1));
      } else moveHole('right');
    },
    onSelect: () => {
      if (!started) {
        if (focusedMenu === 'back') return backMenu();
        if (focusedMenu === 'start') return startGame();
        return; // speed/layout are pure left-right choosers
      }
      hit();
    },
  });

  if (!started) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.menu}>
          <Text style={[styles.title, { fontSize: 30 * fontScale }]}>Whac-a-Mole</Text>
          <Text style={[styles.subtitle, { fontSize: 14 * fontScale }]}>Hit the mole before it disappears!</Text>

          <MenuButton
            label="Back"
            fontScale={fontScale}
            focused={focusedMenu === 'back'}
            onFocus={() => setFocusedMenu('back')}
            onPress={backMenu}
          />

          <OptionSelector
            label="Speed"
            fontScale={fontScale}
            options={SPEEDS}
            selectedIndex={selectedSpeedIdx}
            isFocused={focusedMenu === 'speed'}
            onFocus={() => setFocusedMenu('speed')}
            onLeft={() => setSelectedSpeedIdx((i) => Math.max(0, i - 1))}
            onRight={() => setSelectedSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))}
          />

          <OptionSelector
            label="Layout"
            fontScale={fontScale}
            options={LAYOUTS}
            selectedIndex={selectedLayoutIdx}
            isFocused={focusedMenu === 'layout'}
            onFocus={() => setFocusedMenu('layout')}
            onLeft={() => setSelectedLayoutIdx((i) => Math.max(0, i - 1))}
            onRight={() => setSelectedLayoutIdx((i) => Math.min(LAYOUTS.length - 1, i + 1))}
          />

          <MenuButton
            label="Start Game"
            variant="primary"
            fontScale={fontScale}
            focused={focusedMenu === 'start'}
            onFocus={() => setFocusedMenu('start')}
            onPress={startGame}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Stat label="Score" value={score} fontScale={fontScale} />
        <Stat label="Level" value={level} fontScale={fontScale} accent="#facc15" />
        <Stat label="Lives" value={'❤️'.repeat(lives)} fontScale={fontScale} isEmoji />
        <Stat label="Time" value={`${timeLeft}s`} fontScale={fontScale} />
      </View>

      {showLevelUp && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.levelUpBanner}>
          <Text style={[styles.levelUpText, { fontSize: 20 * fontScale }]}>LEVEL {level}!</Text>
        </Animated.View>
      )}

      {selectedLayout.isCross ? (
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={[styles.board, styles.crossBoard, { width: boardSize, height: boardSize }]}
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
              onPress: hit,
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
              onPress={hit}
            />
          ))}
        </Animated.View>
      )}

      <Text style={[styles.tip, { fontSize: 13 * fontScale }]}>Use D-pad to move • OK to Whack</Text>
    </View>
  );
}

/* ─────────────────────────── HUD stat ─────────────────────────── */

function Stat({ label, value, fontScale, accent, isEmoji }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { fontSize: 12 * fontScale }]}>{label}</Text>
      <Text style={[styles.statValue, { fontSize: (isEmoji ? 16 : 20) * fontScale, color: accent || '#f8fafc' }]}>
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────── Menu button ─────────────────────────── */

function MenuButton({ label, variant = 'secondary', fontScale, focused, onFocus, onPress }) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.06 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(focused ? 1 : 0, FOCUS_SPRING);
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: focusAnim.value > 0.05 ? '#FFE45E' : 'transparent',
    shadowOpacity: 0.2 + focusAnim.value * 0.5,
    elevation: 3 + focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={onFocus} onPress={onPress}>
      <Animated.View style={[styles.menuButton, variant === 'primary' && styles.menuButtonPrimary, animatedStyle]}>
        <Text style={[styles.menuText, { fontSize: 16 * fontScale }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Option selector (Speed / Layout) ─────────────────────────── */

function OptionSelector({ label, fontScale, options, selectedIndex, isFocused, onFocus, onLeft, onRight }) {
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focusAnim.value > 0.05 ? '#FFE45E' : 'transparent',
    shadowOpacity: 0.2 + focusAnim.value * 0.5,
    elevation: 3 + focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={onFocus}>
      <Animated.View style={[styles.selectorRow, animatedStyle]}>
        <Text style={[styles.selectorLabel, { fontSize: 13 * fontScale }]}>{label}</Text>
        <View style={styles.selectorControls}>
          <Pressable
            focusable
            isTVSelectable
            hitSlop={10}
            onPress={onLeft}
            style={styles.selectorArrow}
          >
            <Text style={[styles.selectorArrowText, { fontSize: 16 * fontScale }]}>‹</Text>
          </Pressable>
          <Text style={[styles.selectorValue, { fontSize: 15 * fontScale }]}>{options[selectedIndex].label}</Text>
          <Pressable
            focusable
            isTVSelectable
            hitSlop={10}
            onPress={onRight}
            style={styles.selectorArrow}
          >
            <Text style={[styles.selectorArrowText, { fontSize: 16 * fontScale }]}>›</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#150a24',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  menu: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: '6%',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontWeight: 'bold',
    color: '#FFE45E',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#c4b5fd',
    textAlign: 'center',
    marginBottom: 6,
  },
  menuButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#3b1d5c',
    shadowColor: '#FFE45E',
    shadowOffset: { width: 0, height: 0 },
    minWidth: 200,
    alignItems: 'center',
  },
  menuButtonPrimary: {
    backgroundColor: '#5B21B6',
  },
  menuText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  selectorRow: {
    width: '100%',
    minWidth: 260,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#FFE45E',
    shadowOffset: { width: 0, height: 0 },
    gap: 6,
  },
  selectorLabel: {
    color: '#c4b5fd',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  selectorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3b1d5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorArrowText: {
    color: '#FFE45E',
    fontWeight: 'bold',
  },
  selectorValue: {
    color: '#f8fafc',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  hud: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 6,
  },
  stat: {
    alignItems: 'center',
    minWidth: 56,
  },
  statLabel: {
    color: '#a78bfa',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  levelUpBanner: {
    position: 'absolute',
    top: '38%',
    backgroundColor: 'rgba(250,204,21,0.15)',
    borderColor: '#facc15',
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 8,
    zIndex: 10,
  },
  levelUpText: {
    color: '#facc15',
    fontWeight: '900',
    letterSpacing: 1,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 8,
  },
  crossBoard: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  crossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    color: '#94a3b8',
    marginTop: 6,
  },
});