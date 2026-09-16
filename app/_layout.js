import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // animation: 'slide_from_right',
          // animationDuration: 300,
          animation: "none",
        }}
      >
        {/* <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} /> */}
      </Stack>
    </SafeAreaProvider>
  );
}
