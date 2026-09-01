import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const BOUNCE_SPRING = {
  damping: 22,
  stiffness: 500,
  mass: 0.3,
};

const FOCUS_SPRING = {
  damping: 25,
  stiffness: 600,
  mass: 0.2,
};

export default function Hole({
  id,
  isFocused,
  isVisible,
  onFocusId,
  onPress,
  size = 100,
}) {
  const moleScale = useSharedValue(0);
  const moleOffset = useSharedValue(22);
  const moleOpacity = useSharedValue(0);

  const focusScale = useSharedValue(1);
  const focusGlow = useSharedValue(0);

  // Mole pop animation
  useEffect(() => {
    if (isVisible) {
      moleScale.value = 0.15;
      moleOffset.value = 18;
      moleOpacity.value = 0;

      moleScale.value = withSpring(1, BOUNCE_SPRING);
      moleOffset.value = withSpring(0, BOUNCE_SPRING);
      moleOpacity.value = withTiming(1, { duration: 120 });
    } else {
      moleScale.value = withTiming(0.2, { duration: 120 });
      moleOffset.value = withTiming(18, { duration: 120 });
      moleOpacity.value = withTiming(0, { duration: 80 });
    }
  }, [isVisible]);

  // Focus animation
  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.08 : 1, FOCUS_SPRING);
    focusGlow.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const holeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusScale.value }],
    borderColor: isFocused ? '#FFE45E' : '#5B21B6',
    shadowOpacity: 0.18 + focusGlow.value * 0.55,
    shadowRadius: 6 + focusGlow.value * 18,
    elevation: 3 + focusGlow.value * 10,
  }));

  const moleStyle = useAnimatedStyle(() => ({
    opacity: moleOpacity.value,
    transform: [
      { translateY: moleOffset.value },
      { scale: moleScale.value },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: focusGlow.value,
    transform: [
      {
        scale: interpolate(focusGlow.value, [0, 1], [0.85, 1.08]),
      },
    ],
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
          styles.wrapper,
          holeStyle,
          {
            width: size,
            height: size,
          },
        ]}
      >
        {/* Focus glow */}
        <Animated.View style={[styles.focusRing, ringStyle]} />

        {/* Hole */}
        <View style={styles.holeShadow}>
          <View style={styles.hole} />
        </View>

        {/* Mole */}
        <Animated.View style={[styles.moleContainer, moleStyle]}>
          <View style={styles.earLeft} />
          <View style={styles.earRight} />

          <View style={styles.mole}>
            <View style={styles.eyeRow}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>

            <View style={styles.nose} />
            <View style={styles.smile} />
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 22,
    backgroundColor: '#2A1247',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    overflow: 'hidden',
  },

  focusRing: {
    position: 'absolute',
    width: '94%',
    height: '94%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFE45E',
  },

  holeShadow: {
    width: '72%',
    height: '28%',
    borderRadius: 50,
    backgroundColor: '#14051F',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 18,
  },

  hole: {
    width: '82%',
    height: '45%',
    borderRadius: 50,
    backgroundColor: '#050208',
  },

  moleContainer: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },

  earLeft: {
    position: 'absolute',
    top: -6,
    left: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8D6E63',
    zIndex: -1,
  },

  earRight: {
    position: 'absolute',
    top: -6,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8D6E63',
    zIndex: -1,
  },

  mole: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#A1887F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8D6E63',
  },

  eyeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },

  eye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111',
  },

  nose: {
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#5D4037',
    marginTop: 5,
  },

  smile: {
    width: 14,
    height: 7,
    borderBottomWidth: 1.5,
    borderColor: '#3E2723',
    borderRadius: 8,
    marginTop: 2,
  },
});