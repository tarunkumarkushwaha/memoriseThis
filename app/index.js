import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav"; 
import backgroundImageAsset from "../assets/images/gameboxUI.png";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Active focused index for D-Pad / Remote Navigation (0: Start, 1: About)
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Responsive scale factors
  const isTabletOrTV = width >= 768;
  const isTV = width >= 1200;

  // Remote Navigation Handlers
  const handleUp = useCallback(() => {
    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleDown = useCallback(() => {
    setFocusedIndex((prev) => (prev < 1 ? prev + 1 : prev));
  }, []);

  const handleSelect = useCallback(() => {
    if (focusedIndex === 0) {
      navigation.navigate("gamelist");
    } else if (focusedIndex === 1) {
      navigation.navigate("about");
    }
  }, [focusedIndex, navigation]);

  // Hook up D-Pad remote events
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
            GAME BOX
          </Text>
        </View>

        <Text style={[styles.title, isTabletOrTV && styles.titleLarge]}>
          Unlimited Gaming, One Place
        </Text>
        <Text
          style={[
            styles.description,
            isTabletOrTV && styles.descriptionLarge,
          ]}
        >
          Discover a variety of exciting games to play. Challenge yourself,
          compete with friends, and have endless fun!
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onFocus={() => setFocusedIndex(0)}
            onPress={() => {
              setFocusedIndex(0);
              navigation.navigate("gamelist");
            }}
            style={[
              styles.button,
              styles.primaryButton,
              isTabletOrTV && styles.buttonLarge,
              focusedIndex === 0 && styles.focusedButton,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                isTabletOrTV && styles.buttonTextLarge,
              ]}
            >
              Start Playing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onFocus={() => setFocusedIndex(1)}
            onPress={() => {
              setFocusedIndex(1);
              navigation.navigate("about");
            }}
            style={[
              styles.button,
              styles.secondaryButton,
              isTabletOrTV && styles.buttonLarge,
              focusedIndex === 1 && styles.focusedButton,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                styles.secondaryButtonText,
                isTabletOrTV && styles.buttonTextLarge,
              ]}
            >
              About Game Box
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    borderWidth: 3,
    borderColor: "transparent",
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
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.03 }],
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
});
