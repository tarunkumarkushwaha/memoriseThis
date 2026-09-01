import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Vibration, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation } from '@react-navigation/native';
import { useControllerNav } from '../hooks/useControllerNav.js';

const BOUNCE_SPRING = { damping: 7, stiffness: 220, mass: 0.5 };
const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };
const GRID_COLUMNS = 6;

const CHOMP_SOUND_URI =
  'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative_beeps-6008.mp3';
const WIN_SOUND_URI =
  'https://cdn.pixabay.com/download/audio/2022/03/15/audio_b8c9103636.mp3?filename=correct-83487.mp3';

const SETUP_MAP = {
  minus: { right: 'plus', down: 'start' },
  plus: { left: 'minus', down: 'start' },
  start: { up: 'minus', down: 'back' },
  back: { up: 'start' },
};

export default function CracoTeethGame() {
  const [noOfTeeth, setNoOfTeeth] = useState(8);
  const [loserNumber, setLoserNumber] = useState(null);
  const [game, setGame] = useState(false);
  const [lose, setLose] = useState(false);
  const [win, setWin] = useState(false);
  const [winNo, setWinNo] = useState([]);
  const [round, setRound] = useState(0);
  const [focusedId, setFocusedId] = useState('start');

  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.isTV || width >= 1024;
  const fontScale = isLargeScreen ? 1.5 : 1;

  const numArr = Array.from({ length: noOfTeeth }, (_, i) => i + 1);

  const chompPlayer = useAudioPlayer({ uri: CHOMP_SOUND_URI });
  const winPlayer = useAudioPlayer({ uri: WIN_SOUND_URI });
  const playSound = useCallback((audioPlayer) => {
    try {
      audioPlayer.seekTo(0);
      audioPlayer.play();
    } catch (e) {
      // Never let a network/audio hiccup block gameplay.
    }
  }, []);

  const startGame = () => {
    if (lose || win || game) {
      resetGame();
      return;
    }
    setGame(true);
    setRound((r) => r + 1);
    const randomLoser = Math.floor(Math.random() * noOfTeeth) + 1;
    setLoserNumber(randomLoser);
    setFocusedId(1);
  };

  const resetGame = () => {
    setLoserNumber(null);
    setGame(false);
    setLose(false);
    setWin(false);
    setWinNo([]);
    setFocusedId('start');
  };

  const clickHandler = (number) => {
    if (lose) return;
    if (number !== loserNumber) {
      if (!winNo.includes(number)) {
        setWinNo((prev) => [...prev, number]);
      }
    } else {
      setLose(true);
      setGame(false);
      playSound(chompPlayer);
      Vibration.vibrate(80);
      Alert.alert('Chomp!', 'You lost!');
    }
  };

  useEffect(() => {
    if (game && winNo.length === noOfTeeth - 1) {
      setWin(true);
      setGame(false);
      playSound(winPlayer);
      Alert.alert('Congratulations!', 'You won the game!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winNo]);

  const goBackToMenu = () => navigation.navigate('gamelist');

  const selectFocused = () => {
    if (focusedId === 'minus') return noOfTeeth > 2 && setNoOfTeeth(noOfTeeth - 1);
    if (focusedId === 'plus') return noOfTeeth < 32 && setNoOfTeeth(noOfTeeth + 1);
    if (focusedId === 'start') return startGame();
    if (focusedId === 'back') return goBackToMenu();
    if (typeof focusedId === 'number') return clickHandler(focusedId);
  };

  const moveFocus = (direction) => {
    if (!game && !lose && !win) {
      const next = SETUP_MAP[focusedId]?.[direction];
      if (next) setFocusedId(next);
      return;
    }
    if (focusedId === 'start' || focusedId === 'back') {
      if (focusedId === 'start' && direction === 'right') return setFocusedId('back');
      if (focusedId === 'back' && direction === 'left') return setFocusedId('start');
      if (focusedId === 'start' && direction === 'up' && numArr.length > 0) {
        return setFocusedId(numArr[numArr.length - 1]);
      }
      return;
    }
    if (typeof focusedId === 'number') {
      const idx = numArr.indexOf(focusedId);
      const row = Math.floor(idx / GRID_COLUMNS);
      const col = idx % GRID_COLUMNS;
      let newIdx = idx;
      if (direction === 'left' && col > 0) newIdx = idx - 1;
      else if (direction === 'right' && col < GRID_COLUMNS - 1 && idx + 1 < numArr.length) newIdx = idx + 1;
      else if (direction === 'up') newIdx = idx - GRID_COLUMNS;
      else if (direction === 'down') newIdx = idx + GRID_COLUMNS;

      if (direction === 'down' && newIdx >= numArr.length) return setFocusedId('start');
      if (newIdx < 0 || newIdx >= numArr.length) return;
      setFocusedId(numArr[newIdx]);
    }
  };

  useControllerNav({
    onUp: () => moveFocus('up'),
    onDown: () => moveFocus('down'),
    onLeft: () => moveFocus('left'),
    onRight: () => moveFocus('right'),
    onSelect: selectFocused,
  });

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/craco.png')} style={styles.backgroundImage} resizeMode="cover" />

      <Text style={[styles.title, { fontSize: 28 * fontScale }]}>Crocodile Dentist Game</Text>

      {!game && !lose && !win && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.setupCard}>
          <Text style={[styles.setupLabel, { fontSize: 14 * fontScale }]}>Number of Teeth</Text>
          <View style={styles.stepperRow}>
            <StepperButton
              id="minus"
              symbol="−"
              fontScale={fontScale}
              isFocused={focusedId === 'minus'}
              onFocusId={setFocusedId}
              onPress={() => noOfTeeth > 2 && setNoOfTeeth(noOfTeeth - 1)}
            />
            <Text style={[styles.teethCount, { fontSize: 26 * fontScale }]}>{noOfTeeth}</Text>
            <StepperButton
              id="plus"
              symbol="+"
              fontScale={fontScale}
              isFocused={focusedId === 'plus'}
              onFocusId={setFocusedId}
              onPress={() => noOfTeeth < 32 && setNoOfTeeth(noOfTeeth + 1)}
            />
          </View>
        </Animated.View>
      )}

      <View style={styles.mouthCard}>
        <Image source={require('../assets/images/mouthclosed.png')} style={styles.mouthImage} resizeMode="contain" />
      </View>

      {(game || lose || win) && (
        <View style={styles.teethGridCard}>
          <View style={styles.teethGrid}>
            {numArr.map((item) => (
              <Tooth
                key={item}
                number={item}
                isSafe={winNo.includes(item)}
                isLoser={item === loserNumber && lose}
                isFocused={focusedId === item}
                disabled={lose || win}
                onFocusId={setFocusedId}
                onPress={() => clickHandler(item)}
              />
            ))}
          </View>
          <ChompOverlay triggerKey={lose ? round : 0} active={lose} fontScale={fontScale} />
        </View>
      )}

      {lose && (
        <Animated.Text entering={FadeIn.duration(250)} style={[styles.status, styles.statusLose, { fontSize: 24 * fontScale }]}>
          You Lost!
        </Animated.Text>
      )}
      {win && (
        <Animated.Text entering={FadeIn.duration(250)} style={[styles.status, styles.statusWin, { fontSize: 24 * fontScale }]}>
          You Win!
        </Animated.Text>
      )}

      <ActionButton
        id="start"
        label={game || win || lose ? 'Reset' : 'Start'}
        fontScale={fontScale}
        isFocused={focusedId === 'start'}
        onFocusId={setFocusedId}
        onPress={startGame}
      />
      <ActionButton
        id="back"
        label="Back to Menu"
        variant="secondary"
        fontScale={fontScale}
        isFocused={focusedId === 'back'}
        onFocusId={setFocusedId}
        onPress={goBackToMenu}
      />
    </View>
  );
}

/* ─────────────────────────── Tooth button ─────────────────────────── */

export function Tooth({ number, isSafe, isLoser, isFocused, disabled, onFocusId, onPress }) {
  const pressScale = useSharedValue(1);
  const focusScale = useSharedValue(1);
  const focusAnim = useSharedValue(0);
  const stateAnim = useSharedValue(0); // 0 = neutral, 1 = safe(green), -1 = loser(red)

  const handlePress = () => {
    if (disabled) return;
    pressScale.value = withSequence(withSpring(0.82, BOUNCE_SPRING), withSpring(1, BOUNCE_SPRING));
    onPress();
  };

  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.12 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  useEffect(() => {
    if (isLoser) stateAnim.value = withTiming(-1, { duration: 150 });
    else if (isSafe) stateAnim.value = withSpring(1, BOUNCE_SPRING);
  }, [isSafe, isLoser]);

  const animatedStyle = useAnimatedStyle(() => {
    const bg =
      stateAnim.value < -0.3 ? '#ef4444' : stateAnim.value > 0.3 ? '#22c55e' : '#fefcf8';
    return {
      transform: [{ scale: pressScale.value * focusScale.value }],
      backgroundColor: bg,
      borderColor: focusAnim.value > 0.05 ? '#ffffff' : '#e2d8c3',
      shadowOpacity: 0.25 + focusAnim.value * 0.55,
      shadowRadius: 4 + focusAnim.value * 12,
      elevation: 3 + focusAnim.value * 8,
    };
  });

  return (
    <Pressable
      focusable
      isTVSelectable
      disabled={disabled}
      onFocus={() => onFocusId(number)}
      onBlur={() => onFocusId(null)}
      onPress={handlePress}
    >
      <Animated.View style={[styles.tooth, animatedStyle]}>
        {/* Glossy Enamel Highlight */}
        <View style={styles.enamelHighlight} />

        {/* Tooth Number Label */}
        <Text
          style={[
            styles.toothText,
            (isSafe || isLoser) && styles.toothTextActive,
          ]}
        >
          {number}
        </Text>

        {/* Gum Line Base Depth */}
        <View style={styles.gumBase} />
      </Animated.View>
    </Pressable>
  );
}

/* ───────────────── Chomp overlay — the "mouth closing" simulation ───────────────── */

function ChompOverlay({ triggerKey, active, fontScale }) {
  const translateY = useSharedValue(160);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    translateY.value = withSpring(0, { damping: 9, stiffness: 260, mass: 0.7 });
    flash.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 300 }));
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey, active]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: shakeX.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  if (!active) return null;

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.chompFlash, flashStyle]} />
      <Animated.View style={[styles.chompBar, barStyle]}>
        <Text style={[styles.chompText, { fontSize: 22 * fontScale }]}>CHOMP!</Text>
      </Animated.View>
    </>
  );
}

/* ─────────────────────────── Stepper (-/+) button ─────────────────────────── */

function StepperButton({ id, symbol, fontScale, isFocused, onFocusId, onPress }) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.85, BOUNCE_SPRING), withSpring(1, BOUNCE_SPRING));
    onPress();
  };

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: focusAnim.value > 0.05 ? '#ffffff' : 'transparent',
    shadowOpacity: 0.2 + focusAnim.value * 0.5,
    elevation: 2 + focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={() => onFocusId(id)} onBlur={() => onFocusId(null)} onPress={handlePress}>
      <Animated.View style={[styles.stepperBtn, animatedStyle]}>
        <Text style={[styles.stepperText, { fontSize: 20 * fontScale }]}>{symbol}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Bottom action button ─────────────────────────── */

function ActionButton({ id, label, variant = 'primary', fontScale, isFocused, onFocusId, onPress }) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.06 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: focusAnim.value > 0.05 ? '#ffffff' : 'transparent',
    shadowOpacity: 0.2 + focusAnim.value * 0.45,
    elevation: 3 + focusAnim.value * 9,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={() => onFocusId(id)} onBlur={() => onFocusId(null)} onPress={onPress}>
      <Animated.View style={[styles.actionBtn, variant === 'secondary' && styles.actionBtnSecondary, animatedStyle]}>
        <Text style={[styles.actionBtnText, { fontSize: 16 * fontScale }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1a12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  title: {
    fontWeight: 'bold',
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  setupCard: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 8,
  },
  setupLabel: {
    color: '#bbf7d0',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#166534',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
  },
  stepperText: {
    color: '#f0fdf4',
    fontWeight: 'bold',
  },
  teethCount: {
    color: '#4ade80',
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  mouthCard: {
    width: 220,
    height: 150,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mouthImage: {
    width: '100%',
    height: '100%',
  },
  teethGridCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    // maxWidth: 420,
    overflow: 'hidden',
  },
  teethGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
tooth: {
    width: 38,
    height: 56,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
  },
  enamelHighlight: {
    width: '65%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 3,
    marginTop: 4,
  },
  gumBase: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  toothText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  toothTextActive: {
    color: '#ffffff',
  },
  toothText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  chompFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fca5a5',
  },
  chompBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: '#b91c1c',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderWidth: 3,
    borderColor: '#7f1d1d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chompText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
  },
  status: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusLose: { color: '#ef4444' },
  statusWin: { color: '#facc15' },
  actionBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#22c55e',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
  },
  actionBtnSecondary: {
    backgroundColor: '#1e293b',
    shadowColor: '#ffffff',
  },
  actionBtnText: {
    fontWeight: 'bold',
    color: '#03150a',
    textAlign: 'center',
  },
});
