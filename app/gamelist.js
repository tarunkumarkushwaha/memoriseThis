import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav";
import backgroundImageAsset from "../assets/images/gameboxUI.png";

const games = [
  {
    id: "1",
    name: "Memorise Game",
    route: "memoriseGame",
    description: "Test your memory skills with Simon patterns.",
    image: require("../assets/images/color.png"),
  },
  {
    id: "2",
    name: "Rock Paper Scissors",
    route: "RockPaperScissors",
    description: "Classic hand game showdown against AI.",
    image: require("../assets/images/gameboxUI.png"),
  },
  {
    id: "3",
    name: "Craco Dentist",
    route: "CracoTeethGane",
    description: "remove the incorrect teeth.",
    image: require("../assets/images/mouthclosed.png"),
  },
//   {
//     id: "4",
//     name: "Whak a Mole",
//     route: "WhacAMole",
//     description: "Wack the MoLe.",
//     image: require("../assets/images/gamebox.png"),
//   },
];

export default function GameList() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Index mapping: 0 -> Game 1, 1 -> Game 2, ... N -> Back Button
  const [focusedIndex, setFocusedIndex] = useState(0);

  const isTabletOrTV = width >= 768;
  const isTV = width >= 1200;
  const backButtonIndex = games.length;

  // D-Pad Remote Navigation Handlers
  const handleUp = useCallback(() => {
    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleDown = useCallback(() => {
    setFocusedIndex((prev) => (prev < backButtonIndex ? prev + 1 : prev));
  }, [backButtonIndex]);

  const handleSelect = useCallback(() => {
    if (focusedIndex === backButtonIndex) {
      navigation.navigate("index");
    } else if (games[focusedIndex]) {
      navigation.navigate(games[focusedIndex].route);
    }
  }, [focusedIndex, backButtonIndex, navigation]);

  useControllerNav({
    onUp: handleUp,
    onDown: handleDown,
    onSelect: handleSelect,
  });

  const renderGame = ({ item, index }) => {
    const isFocused = focusedIndex === index;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onFocus={() => setFocusedIndex(index)}
        onPress={() => {
          setFocusedIndex(index);
          navigation.navigate(item.route);
        }}
        style={[
          styles.gameCard,
          isTabletOrTV && styles.gameCardLarge,
          isFocused && styles.focusedCard,
        ]}
      >
        <Image
          source={item.image}
          style={styles.gameCardImage}
          resizeMode="cover"
        />
        <View style={styles.cardDarkOverlay} />

        <View style={styles.cardContent}>
          <Text
            style={[styles.gameTitle, isTabletOrTV && styles.gameTitleLarge]}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.gameDescription,
              isTabletOrTV && styles.gameDescriptionLarge,
            ]}
          >
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* Background Image & Overlay */}
      <Image
        source={backgroundImageAsset}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} />

      {/* Main Glass Card Wrapper */}
      <View
        style={[
          styles.glassCard,
          {
            maxWidth: isTV ? 850 : isTabletOrTV ? 650 : "92%",
            padding: isTabletOrTV ? 32 : 20,
          },
        ]}
      >
        {/* Badge */}
        <View style={styles.logoBadge}>
          <Text style={[styles.logoText, isTabletOrTV && styles.logoTextLarge]}>
            GAME BOX
          </Text>
        </View>

        <Text style={[styles.header, isTabletOrTV && styles.headerLarge]}>
          Choose Your Game
        </Text>

        {/* Game List */}
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Back Button */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onFocus={() => setFocusedIndex(backButtonIndex)}
            onPress={() => {
              setFocusedIndex(backButtonIndex);
              navigation.navigate("index");
            }}
            style={[
              styles.button,
              styles.secondaryButton,
              isTabletOrTV && styles.buttonLarge,
              focusedIndex === backButtonIndex && styles.focusedCard,
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
    maxHeight: "88%",
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
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  logoTextLarge: {
    fontSize: 16,
    letterSpacing: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  headerLarge: {
    fontSize: 34,
    marginBottom: 24,
  },
  list: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 8,
  },
  gameCard: {
    width: "100%",
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  gameCardLarge: {
    height: 120,
    borderRadius: 18,
    marginBottom: 18,
  },
  gameCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },
  cardDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  cardContent: {
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  gameTitleLarge: {
    fontSize: 22,
  },
  gameDescription: {
    fontSize: 13,
    color: "#94a3b8",
  },
  gameDescriptionLarge: {
    fontSize: 15,
  },
  buttonGroup: {
    width: "100%",
    marginTop: 10,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  buttonLarge: {
    paddingVertical: 18,
    borderRadius: 16,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
  /* TV / Remote Dynamic Focus Style */
  focusedCard: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.02 }],
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
});
