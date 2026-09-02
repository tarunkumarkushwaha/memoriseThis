import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

const SPEEDS = [
  { id: "easy", label: "Easy", speed: 1000 },
  { id: "normal", label: "Normal", speed: 800 },
  { id: "hard", label: "Hard", speed: 600 },
  { id: "extreme", label: "Extreme", speed: 450 },
  { id: "God", label: "God", speed: 250 },
];

export default function SpeedSelector({
  selected,
  setSelected,
  focused,
  setFocused,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Speed</Text>

      <View style={styles.row}>
        {SPEEDS.map((item, index) => (
          <Pressable
            key={item.id}
            focusable
            isTVSelectable
            onFocus={() => setFocused(index)}
            onPress={() => setSelected(item)}
          >
            <View
              style={[
                styles.card,
                selected.id === item.id && styles.selected,
                focused === index && styles.focused,
              ]}
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.ms}>{item.speed} ms</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
  },

  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
  },

  row: {
    flexDirection: "row",
    gap: 14,
  },

  card: {
    width: 120,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#32104D",
    borderWidth: 3,
    borderColor: "transparent",
    alignItems: "center",
  },

  focused: {
    borderColor: "#FFD700",
    transform: [{ scale: 1.08 }],
  },

  selected: {
    backgroundColor: "#5B21B6",
  },

  label: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },

  ms: {
    color: "#DDD",
    marginTop: 6,
    fontSize: 14,
  },
});