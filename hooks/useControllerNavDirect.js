/**
 * useControllerNavDirect — bug fix.
 *
 * The original registered BOTH onKeyDownListener and onKeyUpListener with
 * the same handler. Every other working screen in this app's
 * useControllerNav.js uses ONLY onKeyDownListener — that's the proven
 * pattern, not an oversight. react-native-keyevent's native module isn't
 * reliably built to have both listener types active at once without
 * interference, so this can silently break key handling (or double-fire
 * and desync). Fixed by matching the known-good single-listener pattern.
 */
 
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
const KEYCODE_NUMPAD_ENTER = 160;
const KEYCODE_SPACE = 62;
 
export function useControllerNavDirect({ onUp, onDown, onLeft, onRight, onSelect }) {
  const handlersRef = useRef({ onUp, onDown, onLeft, onRight, onSelect });
 
  useEffect(() => {
    handlersRef.current = { onUp, onDown, onLeft, onRight, onSelect };
  }, [onUp, onDown, onLeft, onRight, onSelect]);
 
  useFocusEffect(
    useCallback(() => {
      const handleKeyDown = (evt) => {
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
          case KEYCODE_NUMPAD_ENTER:
          case KEYCODE_SPACE:
            onSelect?.();
            break;
          default:
            break;
        }
      };
 
      // Only onKeyDownListener — matches the proven-working pattern used
      // by every other screen in this app. Attaches only while this
      // screen is focused.
      KeyEvent.onKeyDownListener(handleKeyDown);
 
      return () => {
        KeyEvent.removeKeyDownListener();
      };
    }, [])
  );
}
 