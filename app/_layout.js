import React, {
  createContext,
  useState,
} from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
// import { useEffect } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";

export const DataContext = createContext();

export default function RootLayout() {
  const [dark, setdark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setresult] = useState({});
  const [start, setstart] = useState(false);
  const [timeover, setTimeover] = useState(false);

  const storeData = async (key, value) => {
    try {
      const stringifiedObject = JSON.stringify(value);
      await AsyncStorage.setItem(key, stringifiedObject);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // const LoadingScreen = () => (
  //   <View style={styles.loadingContainer}>
  //     <ActivityIndicator size="large" color="#0000ff" />
  //     <Text style={styles.loadingText}>Loading Quizes</Text>
  //   </View>
  // );

  // if (loading) {
  //   return <LoadingScreen />;
  // }

  return (
    <DataContext.Provider
      value={{
        dark,
        setdark,
        loading,
        setLoading,
        start,
        setstart,
        timeover,
        setTimeover,
        result,
        setresult,
        storeData,
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </DataContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: "#333",
  },
});

