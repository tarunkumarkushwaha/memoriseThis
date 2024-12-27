import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { DataContext } from "../app/_layout";

const Timer = ({ finalSubmit, remainingTime, setRemainingTime }) => {
  const { start, setstart, result } = useContext(DataContext);

  useEffect(() => {
    if (start) {
      const totalSeconds = (result.TestQuestion.time || 0) * 60;
      setRemainingTime(totalSeconds);
    }
  }, [start, result.TestQuestion.time]);

  useEffect(() => {
    if (!start || remainingTime <= 0) return;

    const timerInterval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setstart(false);
          finalSubmit(remainingTime);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [start, remainingTime]);

  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timeText}>{minutes}</Text>
      <Text style={styles.separator}>:</Text>
      <Text style={styles.timeText}>
        {seconds < 10 ? `0${seconds}` : seconds}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#98FB98",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  timeText: {
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
    color: "#333",
  },
  separator: {
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
    color: "#333",
    marginHorizontal: 5,
  },
});

export default Timer;
