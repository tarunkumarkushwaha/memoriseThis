import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav";
import backgroundImageAsset from "../assets/images/gameboxUI.png";

const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

export default function HomeScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [focusedIndex, setFocusedIndex] = useState(0); // 0: Start, 1: About

  const isTabletOrTV = width >= 768;
  const isTV = width >= 1200;

  const handleUp = useCallback(() => {
    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);
  const handleDown = useCallback(() => {
    setFocusedIndex((prev) => (prev < 1 ? prev + 1 : prev));
  }, []);
  const handleSelect = useCallback(() => {
    if (focusedIndex === 0) navigation.navigate("gamelist");
    else if (focusedIndex === 1) navigation.navigate("about");
  }, [focusedIndex, navigation]);

  useControllerNav({
    onUp: handleUp,
    onDown: handleDown,
    onSelect: handleSelect,
  });

  return (
    <View style={styles.mainContainer}>
      <Image
        source={backgroundImageAsset}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} />

      <View
        style={[
          styles.glassCard,
          {
            maxWidth: isTV ? 800 : isTabletOrTV ? 600 : "90%",
            padding: isTabletOrTV ? 40 : 24,
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Text style={[styles.logoText, isTabletOrTV && styles.logoTextLarge]}>
            Play OTG
          </Text>
        </View>

        <Text style={[styles.title, isTabletOrTV && styles.titleLarge]}>
          Unlimited Gaming, One Place
        </Text>
        <Text
          style={[styles.description, isTabletOrTV && styles.descriptionLarge]}
        >
          Discover a variety of exciting games to play. Challenge yourself,
          compete with friends, and have endless fun!
        </Text>

        <View style={styles.buttonGroup}>
          <NavButton
            label="Start Playing"
            variant="primary"
            isTabletOrTV={isTabletOrTV}
            isFocused={focusedIndex === 0}
            onFocus={() => setFocusedIndex(0)}
            onPress={() => navigation.navigate("gamelist")}
          />
          <NavButton
            label="About Play OTG"
            variant="secondary"
            isTabletOrTV={isTabletOrTV}
            isFocused={focusedIndex === 1}
            onFocus={() => setFocusedIndex(1)}
            onPress={() => navigation.navigate("about")}
          />
        </View>
      </View>
    </View>
  );
}

function NavButton({
  label,
  variant,
  isTabletOrTV,
  isFocused,
  onFocus,
  onPress,
}) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.05 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: 2,
    // interpolateColor (not a raw ternary) — on New Architecture, a plain
    // conditional string swap for borderColor can fail to re-commit
    // natively even though the exact same shared value drives `scale`
    // correctly. interpolateColor goes through Reanimated's proper color
    // pipeline and updates reliably.
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#ffffff"],
    ),
    shadowOpacity: focusAnim.value * 0.6,
    shadowRadius: focusAnim.value * 14,
    elevation: focusAnim.value * 10,
  }));

  return (
    <Pressable focusable isTVSelectable onFocus={onFocus} onPress={onPress}>
      <Animated.View
        style={[
          styles.button,
          variant === "primary" ? styles.primaryButton : styles.secondaryButton,
          isTabletOrTV && styles.buttonLarge,
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.secondaryButtonText,
            isTabletOrTV && styles.buttonTextLarge,
          ]}
        >
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
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.85, // Adjust opacity to control background brightness
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 19, 0.45)", // Tint overlay
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
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  logoTextLarge: {
    fontSize: 18,
    letterSpacing: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontSize: 38,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
  },
  descriptionLarge: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 40,
  },
  buttonGroup: {
    width: "100%",
    gap: 14,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    // borderWidth: 3,
    // borderColor: "transparent",
  },
  buttonLarge: {
    paddingVertical: 20,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: "#cbd5e1",
  },
  buttonTextLarge: {
    fontSize: 20,
  },
  focusedButton: {
    // borderColor: "#FFFFFF",
    transform: [{ scale: 1.03 }],
    // shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
});
