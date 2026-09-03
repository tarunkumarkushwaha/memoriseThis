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

export default function AboutScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(true);
  const isTabletOrTV = width >= 768;
  const isTV = width >= 1200;

  const features = [
    "No ads",
    "Wide variety of games",
    "Intuitive and interactive UI",
    "Regular updates with new content",
  ];

  const handleSelect = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useControllerNav({
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
          About Play OTG
        </Text>
        <Text
          style={[styles.description, isTabletOrTV && styles.descriptionLarge]}
        >
          Welcome to Play OTG, your ultimate destination for fun and engaging
          games! Our app offers a curated selection of games designed to
          entertain, challenge, and inspire players of all ages.
        </Text>

        <View style={styles.featuresContainer}>
          <Text
            style={[
              styles.featuresTitle,
              isTabletOrTV && styles.featuresTitleLarge,
            ]}
          >
            Key Features
          </Text>
          {features.map((item, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.bulletDot} />
              <Text
                style={[
                  styles.featureItemText,
                  isTabletOrTV && styles.featureItemTextLarge,
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              styles.secondaryButton,
              isTabletOrTV && styles.buttonLarge,
              isFocused && styles.focusedButton,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                isTabletOrTV && styles.buttonTextLarge,
              ]}
            >
              Back to Home
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
    opacity: 0.85,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 19, 0.45)",
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
    marginBottom: 16,
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
    marginBottom: 20,
  },
  descriptionLarge: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 28,
  },
  featuresContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#818cf8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  featuresTitleLarge: {
    fontSize: 20,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6366f1",
    marginRight: 10,
  },
  featureItemText: {
    fontSize: 14,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  featureItemTextLarge: {
    fontSize: 16,
  },
  buttonGroup: {
    width: "100%",
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
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonTextLarge: {
    fontSize: 20,
  },
  /* Dynamic White Border on Focus */
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
