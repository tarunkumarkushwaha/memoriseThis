import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import React, { useState, useCallback, useEffect } from "react";
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
    image: require("../assets/images/rock.png"),
  },
  {
    id: "3",
    name: "Craco Dentist",
    route: "CracoTeethGane",
    description: "Remove the incorrect teeth.",
    image: require("../assets/images/mouthclosed.png"),
  },
  {
    id: "4",
    name: "Whack a Mole",
    route: "WhacAMole",
    description: "Whack the mole as fast as you can.",
    image: require("../assets/images/mole.png"),
  },
  {
    id: "5",
    name: "Ludo",
    route: "Ludo",
    description: "Classic 4-player token board game.",
    image: require("../assets/images/dice.jpg"),
  },
  {
    id: "6",
    name: "Tic Tack Toe",
    route: "TicTacToe",
    description: "Tic Tack Toe",
    image: require("../assets/images/mole.png"),
  },
];

const FOCUS_SPRING = { damping: 10, stiffness: 180, mass: 0.6 };

export default function GameList() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [focusedIndex, setFocusedIndex] = useState(0);

  const isTabletOrTV = width >= 768;
  const isTV = width >= 1200;

  const numColumns = isTV ? 3 : isTabletOrTV ? 3 : 2;
  const totalItems = games.length;
  const backButtonIndex = totalItems;

  const handleUp = useCallback(() => {
    setFocusedIndex((prev) => {
      if (prev === backButtonIndex) {
        const lastRowStart =
          Math.floor((totalItems - 1) / numColumns) * numColumns;
        return Math.min(lastRowStart, totalItems - 1);
      }
      return prev - numColumns >= 0 ? prev - numColumns : prev;
    });
  }, [backButtonIndex, numColumns, totalItems]);

  const handleDown = useCallback(() => {
    setFocusedIndex((prev) => {
      if (prev === backButtonIndex) return prev;
      if (prev + numColumns < totalItems) return prev + numColumns;
      return backButtonIndex;
    });
  }, [backButtonIndex, numColumns, totalItems]);

  const handleLeft = useCallback(() => {
    setFocusedIndex((prev) => {
      if (prev === backButtonIndex) return prev;
      return prev % numColumns !== 0 ? prev - 1 : prev;
    });
  }, [backButtonIndex, numColumns]);

  const handleRight = useCallback(() => {
    setFocusedIndex((prev) => {
      if (prev === backButtonIndex) return prev;
      return (prev + 1) % numColumns !== 0 && prev + 1 < totalItems
        ? prev + 1
        : prev;
    });
  }, [backButtonIndex, numColumns, totalItems]);

  const handleSelect = useCallback(() => {
    if (focusedIndex === backButtonIndex) navigation.navigate("index");
    else if (games[focusedIndex])
      navigation.navigate(games[focusedIndex].route);
  }, [focusedIndex, backButtonIndex, navigation]);

  useControllerNav({
    onUp: handleUp,
    onDown: handleDown,
    onLeft: handleLeft,
    onRight: handleRight,
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
            maxWidth: isTV ? 1100 : isTabletOrTV ? 850 : "94%",
            maxHeight: isTV ? "100%" : "95%",
            padding: isTabletOrTV ? 28 : 16,
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Text style={[styles.logoText, isTabletOrTV && styles.logoTextLarge]}>
            Play OTG COLLECTION
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {games.map((item, index) => (
              <GameCard
                key={item.id}
                item={item}
                isTabletOrTV={isTabletOrTV}
                numColumns={numColumns}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
                onPress={() => navigation.navigate(item.route)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonGroup}>
          <BackButton
            isTabletOrTV={isTabletOrTV}
            isFocused={focusedIndex === backButtonIndex}
            onFocus={() => setFocusedIndex(backButtonIndex)}
            onPress={() => navigation.navigate("index")}
          />
        </View>
      </View>
    </View>
  );
}

function GameCard({
  item,
  isTabletOrTV,
  numColumns,
  isFocused,
  onFocus,
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
    borderWidth: 2,
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      ["transparent", "#ffffff"],
    ),
    shadowOpacity: focusAnim.value * 0.6,
    shadowRadius: focusAnim.value * 16,
    elevation: focusAnim.value * 10,
  }));

  return (
    <Pressable
      focusable
      isTVSelectable
      onFocus={onFocus}
      onPress={onPress}
      style={{ width: `${100 / numColumns}%`, padding: 6 }}
    >
      <Animated.View
        style={[
          styles.gameCard,
          isTabletOrTV && styles.gameCardLarge,
          animatedStyle,
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
            numberOfLines={1}
            style={[styles.gameTitle, isTabletOrTV && styles.gameTitleLarge]}
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.gameDescription,
              isTabletOrTV && styles.gameDescriptionLarge,
            ]}
          >
            {item.description}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function BackButton({ isTabletOrTV, isFocused, onFocus, onPress }) {
  const scale = useSharedValue(1);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.05 : 1, FOCUS_SPRING);
    focusAnim.value = withSpring(isFocused ? 1 : 0, FOCUS_SPRING);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: 2,
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
          styles.secondaryButton,
          isTabletOrTV && styles.buttonLarge,
          animatedStyle,
        ]}
      >
        <Text
          style={[styles.buttonText, isTabletOrTV && styles.buttonTextLarge]}
        >
          Back to Home
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
    opacity: 0.85,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 19, 0.55)",
  },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.78)",
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
    marginBottom: 8,
  },
  logoText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  logoTextLarge: {
    fontSize: 14,
    letterSpacing: 3.5,
  },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  headerLarge: {
    fontSize: 32,
    marginBottom: 20,
  },
  list: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 14,
  },
  gameCard: {
    flex: 1,
    height: 145,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
  },
  gameCardLarge: {
    height: 185,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  gameCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  cardDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  cardContent: {
    padding: 12,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  gameTitleLarge: {
    fontSize: 19,
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 15,
  },
  gameDescriptionLarge: {
    fontSize: 13,
    lineHeight: 17,
  },
  buttonGroup: {
    width: "100%",
    marginTop: 8,
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  buttonLarge: {
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonTextLarge: {
    fontSize: 17,
  },

  focusedCard: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.04 }],
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  focusedButton: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    transform: [{ scale: 1.02 }],
  },
});
