import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import KeyEvent from "react-native-keyevent";

const KEYCODE_DPAD_UP = 19;
const KEYCODE_DPAD_DOWN = 20;
const KEYCODE_DPAD_LEFT = 21;
const KEYCODE_DPAD_RIGHT = 22;
const KEYCODE_DPAD_CENTER = 23;
const KEYCODE_ENTER = 66;
const KEYCODE_BUTTON_A = 96;

/**
 * Attaches a single global key-event listener ONLY while the screen calling
 * this hook is the currently focused route. Prevents the "stale listener
 * from a previous screen" issue, since react-native-keyevent only supports
 * one active listener at a time.
 *
 * @param {object} handlers
 * @param {() => void} [handlers.onUp]
 * @param {() => void} [handlers.onDown]
 * @param {() => void} [handlers.onLeft]
 * @param {() => void} [handlers.onRight]
 * @param {() => void} [handlers.onSelect]
 */
export function useControllerNav({ onUp, onDown, onLeft, onRight, onSelect }) {
  useFocusEffect(
    useCallback(() => {
      const onKeyDown = (evt) => {
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
    }, [onUp, onDown, onLeft, onRight, onSelect])
  );
}