import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useDpadPress } from "./useDpadPress";
import { useGamepadPress } from "./useGamepadPress";

/**
 * Custom hook to manage TV remote & Gamepad button inputs + back navigation.
 *
 * @param {Object} options
 * @param {Function} [options.onPress] Optional callback fired on any valid button press: (direction, code) => void
 * @param {boolean} [options.autoNavigateBack=true] Automatically navigate back if BACK button is pressed
 * @returns {{ direction: string|null, code: number|null, GamepadListener: JSX.Element }}
 */
export function useRemoteControl({ onPress, autoNavigateBack = true } = {}) {
  const router = useRouter();
  const [lastInput, setLastInput] = useState({ direction: null, code: null });

  const handlePress = useCallback(
    (direction, code) => {
      // 1. Update internal state
      setLastInput({ direction, code });

      // 2. Log for debugging
      // console.log(`[useRemoteControl] Direction: ${direction}, Code/Index: ${code}`);

      // 3. Handle BACK button navigation automatically
      if (direction === "BACK" && autoNavigateBack) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push("/gamelist"); // Fallback if no history stack
        }
        return;
      }

      // 4. Trigger custom consumer callback
      onPress?.(direction, code);
    },
    [router, autoNavigateBack, onPress],
  );

  // Bind D-pad & Gamepad to unified handler
  const [remoteDirection, remoteKeycode] = useDpadPress(handlePress);
  const [gamepadDirection, GamepadListener, keyindex] =
    useGamepadPress(handlePress);

  const activeDirection =
    gamepadDirection ?? remoteDirection ?? lastInput.direction;
  const activeCode = remoteKeycode ?? lastInput.code;

  return {
    direction: activeDirection,
    // code: activeCode,
    code: keyindex,
    GamepadListener,
  };
}
