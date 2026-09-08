import { Stack } from 'expo-router';

export default function Layout() {
  return (
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
  );
}
