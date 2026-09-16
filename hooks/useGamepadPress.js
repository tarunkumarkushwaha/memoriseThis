// hooks/useGamepadPress.js
import { useRef, useState, useCallback } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const BUTTON_MAP = {
  12: "UP",
  13: "DOWN",
  14: "LEFT",
  15: "RIGHT",
  0: "CENTER",
  1: "BACK",
};

const AUTO_CLEAR_MS = 800;

const POLL_SCRIPT = `
(function () {
  var lastPressed = {};
  setInterval(function () {
    var gp = (navigator.getGamepads ? navigator.getGamepads() : [])[0];
    if (!gp) return;
    gp.buttons.forEach(function (btn, index) {
      var isPressed = btn.pressed || btn.value > 0.5;
      if (isPressed && !lastPressed[index]) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ index: index }));
      }
      lastPressed[index] = isPressed;
    });
  }, 50);
})();
true;
`;

export function useGamepadPress(onPress) {
  const [direction, setDirection] = useState(null);
  const clearTimer = useRef(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const handleMessage = useCallback((event) => {
    let index;
    try {
      ({ index } = JSON.parse(event.nativeEvent.data));
    } catch {
      return;
    }

    // console.log("Gamepad Button Index Pressed:", index);

    const dir = BUTTON_MAP[index];
    if (!dir) return;

    setDirection(dir);
    onPressRef.current?.(dir);

    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setDirection(null), AUTO_CLEAR_MS);
  }, []);

  const GamepadListener = (
    <WebView
      style={styles.hidden}
      originWhitelist={["*"]}
      source={{ html: "<html><body></body></html>" }}
      injectedJavaScript={POLL_SCRIPT}
      onMessage={handleMessage}
    />
  );

  return [direction, GamepadListener];
}

const styles = StyleSheet.create({
  hidden: { width: 1, height: 1, opacity: 0 },
});
