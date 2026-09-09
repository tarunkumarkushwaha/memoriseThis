import { useEffect, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import KeyEvent from "react-native-keyevent";

const KEYCODE_DPAD_UP = 19;
const KEYCODE_DPAD_DOWN = 20;
const KEYCODE_DPAD_LEFT = 21;
const KEYCODE_DPAD_RIGHT = 22;
const KEYCODE_DPAD_CENTER = 23;
const KEYCODE_ENTER = 66;
const KEYCODE_BUTTON_A = 96;

/**
 * Attaches a single global key-event listener while the screen is focused.
 * Uses `useRef` to guarantee callbacks always read the latest state without
 * continuously re-attaching key listeners.
 */
export function useControllerNavDirect({ onUp, onDown, onLeft, onRight, onSelect }) {
  // Store callbacks in refs to eliminate stale closure bugs during state updates
  const handlersRef = useRef({ onUp, onDown, onLeft, onRight, onSelect });

  useEffect(() => {
    handlersRef.current = { onUp, onDown, onLeft, onRight, onSelect };
  }, [onUp, onDown, onLeft, onRight, onSelect]);

  useFocusEffect(
    useCallback(() => {
      const onKeyDown = (evt) => {
        if (!evt || typeof evt.keyCode !== "number") return;

        const { onUp, onDown, onLeft, onRight, onSelect } = handlersRef.current;

        switch (evt.keyCode) {
          case KEYCODE_DPAD_UP:
            onUp?.();
            break;
          case KEYCODE_DPAD_DOWN:
            onDown?.();
            break;
          case KEYCODE_DPAD_LEFT:
            onLeft?.();
            break;
          case KEYCODE_DPAD_RIGHT:
            onRight?.();
            break;
          case KEYCODE_DPAD_CENTER:
          case KEYCODE_ENTER:
          case KEYCODE_BUTTON_A:
            onSelect?.();
            break;
          default:
            break;
        }
      };

      KeyEvent.onKeyDownListener(onKeyDown);

      return () => {
        KeyEvent.removeKeyDownListener();
      };
    }, []) // Empty dependency array prevents listener teardown on state re-renders
  );
}