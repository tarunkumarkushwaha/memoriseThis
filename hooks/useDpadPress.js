// hooks/useDpadPress.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import KeyEvent from "react-native-keyevent";
import { Alert } from "react-native";

const DIRECTION_BY_KEYCODE = {
  4: "BACK",
  19: "UP",
  20: "DOWN",
  21: "LEFT",
  22: "RIGHT",
  23: "CENTER", // DPAD_CENTER
  66: "CENTER", // ENTER
  96: "CENTER", // BUTTON_A
  160: "CENTER", // NUMPAD_ENTER
  62: "CENTER", // SPACE
};

const DEBOUNCE_MS = 80;
const AUTO_CLEAR_MS = 300;

/**
 * useDpadPress(onPress?)
 *
 * Returns the last direction pressed ("UP" | "DOWN" | "LEFT" | "RIGHT" | "CENTER" | null),
 * which auto-clears back to null after AUTO_CLEAR_MS so you can drive a
 * "flash" UI off it directly. Also fires an optional onPress(direction)
 * callback for components that want to trigger their own logic instead
 * of (or in addition to) reading the returned value.
 */
export function useDpadPress(onPress) {
  const [direction, setDirection] = useState(null);
  const [keycode, setKeycode] = useState(null);
  const lastPressTime = useRef(0);
  const resetTimer = useRef(null);
  const onPressRef = useRef(onPress);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useFocusEffect(
    useCallback(() => {
      const handleKeyDown = (evt) => {
        if (!evt || typeof evt.keyCode !== "number") return;
        // console.log("Remote KeyCode Pressed:", evt.keyCode);
        setKeycode(evt.keyCode);
        const dir = DIRECTION_BY_KEYCODE[evt.keyCode];
        if (!dir) return; // not a direction/select key — ignore silently

        const now = Date.now();
        if (now - lastPressTime.current < DEBOUNCE_MS) return;
        lastPressTime.current = now;
        setDirection(dir);
        onPressRef.current?.(dir);

        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(
          () => setDirection(null),
          AUTO_CLEAR_MS,
        );
      };

      KeyEvent.onKeyDownListener(handleKeyDown);

      return () => {
        KeyEvent.removeKeyDownListener();
        if (resetTimer.current) clearTimeout(resetTimer.current);
      };
    }, []),
  );

  return [direction, keycode];
}
