import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useControllerNav } from "../hooks/useControllerNav";
import { LuComputer } from "react-icons/lu";
import { IoIosMan } from "react-icons/io";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const GRID_MAP = {
  0: { right: 1, down: 3 },
  1: { left: 0, right: 2, down: 4 },
  2: { left: 1, down: 5 },

  3: { up: 0, right: 4, down: 6 },
  4: { up: 1, left: 3, right: 5, down: 7 },
  5: { up: 2, left: 4, down: 8 },

  6: { up: 3, right: 7, down: "btn-back" },
  7: { up: 4, left: 6, right: 8, down: "btn-round" },
  8: { up: 5, left: 7, down: "btn-reset" },
};

const MENU_MAP = {
  back: { down: "mode-cpu" },
  "mode-cpu": { up: "back", right: "mode-hotseat", down: "start" },
  "mode-hotseat": { up: "back", left: "mode-cpu", down: "start" },
  start: { up: "mode-cpu" },
};

export default function TicTacToe() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const isTabletOrTV = Platform.isTV || width >= 768;
  const isTV = width >= 1200;

  // Responsive board & cell sizing
  const boardSize = isTV
    ? Math.min(500, height * 0.5)
    : isTabletOrTV
    ? Math.min(420, height * 0.48)
    : Math.min(320, width * 0.85);

  const cellSize = boardSize / 3 - (isTabletOrTV ? 12 : 8);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [current, setCurrent] = useState("X");
  const [mode, setMode] = useState("cpu"); // "cpu" | "hotseat"
  const [started, setStarted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [draw, setDraw] = useState(false);
  const [isCpuThinking, setIsCpuThinking] = useState(false);

  // Focus targets for controller support
  const [focusCell, setFocusCell] = useState(4);
  const [menuFocus, setMenuFocus] = useState("start");
  const [gameControlFocus, setGameControlFocus] = useState("cell"); // "cell" | "btn-back" | "btn-round" | "btn-reset"

  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);
  const [scoreDraw, setScoreDraw] = useState(0);

  const checkWinner = useCallback((b) => {
    for (const [a, b1, c] of WIN_LINES) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
        return b[a];
      }
    }
    return null;
  }, []);

  const isDraw = useCallback((b) => b.every(Boolean) && !checkWinner(b), [checkWinner]);

  const minimax = useCallback((b, maximizing) => {
    const w = checkWinner(b);
    if (w === "O") return 10;
    if (w === "X") return -10;
    if (b.every(Boolean)) return 0;

    if (maximizing) {
      let best = -999;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = "O";
          best = Math.max(best, minimax(b, false));
          b[i] = null;
        }
      }
      return best;
    } else {
      let best = 999;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = "X";
          best = Math.min(best, minimax(b, true));
          b[i] = null;
        }
      }
      return best;
    }
  }, [checkWinner]);

  const bestMove = useCallback((b) => {
    let score = -999;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "O";
        const value = minimax(b, false);
        b[i] = null;
        if (value > score) {
          score = value;
          move = i;
        }
      }
    }
    return move;
  }, [minimax]);

  const checkAndFinishGame = useCallback((nextBoard) => {
    const w = checkWinner(nextBoard);
    if (w) {
      setWinner(w);
      if (w === "X") setScoreX((s) => s + 1);
      else setScoreO((s) => s + 1);
      return true;
    }
    if (isDraw(nextBoard)) {
      setDraw(true);
      setScoreDraw((s) => s + 1);
      return true;
    }
    return false;
  }, [checkWinner, isDraw]);

  const makeMove = useCallback((index, playerSymbol) => {
    const nextBoard = [...board];
    nextBoard[index] = playerSymbol;
    setBoard(nextBoard);

    const ended = checkAndFinishGame(nextBoard);
    if (!ended) {
      const nextTurn = playerSymbol === "X" ? "O" : "X";
      setCurrent(nextTurn);
    }
    return { ended, nextBoard };
  }, [board, checkAndFinishGame]);

  // Trigger CPU move when applicable
  useEffect(() => {
    if (started && mode === "cpu" && current === "O" && !winner && !draw && !isCpuThinking) {
      setIsCpuThinking(true);
      const timer = setTimeout(() => {
        const cpuIdx = bestMove(board);
        if (cpuIdx !== -1) {
          makeMove(cpuIdx, "O");
        }
        setIsCpuThinking(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [started, mode, current, winner, draw, board, bestMove, makeMove, isCpuThinking]);

  const playCell = (index) => {
    if (board[index] || winner || draw || isCpuThinking) return;
    if (mode === "cpu" && current !== "X") return;

    makeMove(index, current);
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setWinner(null);
    setDraw(false);
    setFocusCell(4);
    setIsCpuThinking(false);
  };

  const resetScore = () => {
    resetBoard();
    setScoreX(0);
    setScoreO(0);
    setScoreDraw(0);
  };

  const exitToMenu = () => {
    resetBoard();
    setStarted(false);
    setMenuFocus("start");
  };

  const moveGrid = (dir) => {
    if (gameControlFocus !== "cell") {
      if (dir === "up") {
        setGameControlFocus("cell");
        setFocusCell(6);
      }
      return;
    }

    const next = GRID_MAP[focusCell]?.[dir];
    if (typeof next === "number") {
      setFocusCell(next);
    } else if (typeof next === "string") {
      setGameControlFocus(next);
    }
  };

  useControllerNav({
    onUp: () => {
      if (!started) {
        const n = MENU_MAP[menuFocus]?.up;
        if (n) setMenuFocus(n);
      } else {
        moveGrid("up");
      }
    },
    onDown: () => {
      if (!started) {
        const n = MENU_MAP[menuFocus]?.down;
        if (n) setMenuFocus(n);
      } else {
        moveGrid("down");
      }
    },
    onLeft: () => {
      if (!started) {
        const n = MENU_MAP[menuFocus]?.left;
        if (n) setMenuFocus(n);
        else if (menuFocus === "mode-hotseat") setMode("cpu");
      } else {
        if (gameControlFocus === "btn-round") setGameControlFocus("btn-back");
        else if (gameControlFocus === "btn-reset") setGameControlFocus("btn-round");
        else moveGrid("left");
      }
    },
    onRight: () => {
      if (!started) {
        const n = MENU_MAP[menuFocus]?.right;
        if (n) setMenuFocus(n);
        else if (menuFocus === "mode-cpu") setMode("hotseat");
      } else {
        if (gameControlFocus === "btn-back") setGameControlFocus("btn-round");
        else if (gameControlFocus === "btn-round") setGameControlFocus("btn-reset");
        else moveGrid("right");
      }
    },
    onSelect: () => {
      if (!started) {
        if (menuFocus === "back") navigation.goBack();
        else if (menuFocus === "mode-cpu") setMode("cpu");
        else if (menuFocus === "mode-hotseat") setMode("hotseat");
        else if (menuFocus === "start") {
          resetBoard();
          setStarted(true);
          setGameControlFocus("cell");
        }
      } else {
        if (gameControlFocus === "btn-back") exitToMenu();
        else if (gameControlFocus === "btn-round") resetBoard();
        else if (gameControlFocus === "btn-reset") resetScore();
        else playCell(focusCell);
      }
    },
  });

  if (!started) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.menuCard}>
          <Text style={[styles.title, isTabletOrTV && styles.titleLarge]}>
            Tic-Tac-Toe
          </Text>
          <Text style={[styles.subtitle, isTabletOrTV && styles.subtitleLarge]}>
            Choose mode & get ready
          </Text>

          {/* Mode Selector */}
          <View style={styles.modeBox}>
            <Text style={styles.modeTitle}>SELECT GAME MODE</Text>

            <View style={styles.modeRow}>
              <Pressable
                focusable
                isTVSelectable
                onFocus={() => setMenuFocus("mode-cpu")}
                onPress={() => setMode("cpu")}
                style={[
                  styles.modeOption,
                  mode === "cpu" && styles.modeActive,
                  menuFocus === "mode-cpu" && styles.focusBtn,
                ]}
              >
                <Text style={styles.modeText}>🤖 Vs CPU</Text>
              </Pressable>

              <Pressable
                focusable
                isTVSelectable
                onFocus={() => setMenuFocus("mode-hotseat")}
                onPress={() => setMode("hotseat")}
                style={[
                  styles.modeOption,
                  mode === "hotseat" && styles.modeActive,
                  menuFocus === "mode-hotseat" && styles.focusBtn,
                ]}
              >
                <Text style={styles.modeText}>👥 2 Player</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            focusable
            isTVSelectable
            onFocus={() => setMenuFocus("start")}
            onPress={() => {
              resetBoard();
              setStarted(true);
              setGameControlFocus("cell");
            }}
            style={[
              styles.menuBtn,
              styles.startBtn,
              menuFocus === "start" && styles.focusBtn,
            ]}
          >
            <Text style={styles.startBtnText}>Start Game</Text>
          </Pressable>

          <Pressable
            focusable
            isTVSelectable
            onFocus={() => setMenuFocus("back")}
            onPress={() => navigation.goBack()}
            style={[
              styles.menuBtn,
              styles.backBtn,
              menuFocus === "back" && styles.focusBtn,
            ]}
          >
            <Text style={styles.menuText}>← Main Menu</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Row with Back Button */}
      <View style={[styles.topNavRow, { width: boardSize + 20 }]}>
        <Pressable
          focusable
          isTVSelectable
          onFocus={() => setGameControlFocus("btn-back")}
          onPress={exitToMenu}
          style={[
            styles.headerBackBtn,
            gameControlFocus === "btn-back" && styles.focusBtn,
          ]}
        >
          <Text style={styles.headerBackText}>← Exit</Text>
        </Pressable>

        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {mode === "cpu" ? "🤖 vs CPU" : "👥 2-Player"}
          </Text>
        </View>
      </View>

      <View style={[styles.scoreRow, { width: boardSize }]}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Player X</Text>
          <Text style={styles.scoreValue}>{scoreX}</Text>
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Draws</Text>
          <Text style={styles.scoreValue}>{scoreDraw}</Text>
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{mode === "cpu" ? "CPU (O)" : "Player O"}</Text>
          <Text style={styles.scoreValue}>{scoreO}</Text>
        </View>
      </View>

      {/* Status Header */}
      <Text style={[styles.status, isTabletOrTV && styles.statusLarge]}>
        {winner
          ? winner === "X"
            ? "🎉 Player X Wins!"
            : mode === "cpu"
            ? "🤖 CPU Wins!"
            : "🎉 Player O Wins!"
          : draw
          ? "🤝 Game Draw!"
          : isCpuThinking
          ? "🤖 CPU is thinking..."
          : mode === "cpu"
          ? "Your Turn (X)"
          : `${current}'s Turn`}
      </Text>

      {/* Grid Board */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[
          styles.board,
          { width: boardSize, height: boardSize },
        ]}
      >
        {board.map((value, index) => {
          const isFocused = gameControlFocus === "cell" && focusCell === index;
          return (
            <Pressable
              key={index}
              focusable
              isTVSelectable
              onFocus={() => {
                setGameControlFocus("cell");
                setFocusCell(index);
              }}
              onPress={() => playCell(index)}
              style={[
                styles.cell,
                { width: cellSize, height: cellSize },
                isFocused && styles.cellFocus,
              ]}
            >
              <Text
                style={[
                  styles.symbol,
                  isTabletOrTV && styles.symbolLarge,
                  value === "X" && styles.xColor,
                  value === "O" && styles.oColor,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      {/* Action Buttons */}
      <View style={[styles.bottomRow, { width: boardSize }]}>
        <Pressable
          focusable
          isTVSelectable
          onFocus={() => setGameControlFocus("btn-round")}
          onPress={resetBoard}
          style={[
            styles.bottomBtn,
            gameControlFocus === "btn-round" && styles.focusBtn,
          ]}
        >
          <Text style={styles.bottomText}>New Round</Text>
        </Pressable>

        <Pressable
          focusable
          isTVSelectable
          onFocus={() => setGameControlFocus("btn-reset")}
          onPress={resetScore}
          style={[
            styles.bottomBtn,
            styles.resetBtn,
            gameControlFocus === "btn-reset" && styles.focusBtn,
          ]}
        >
          <Text style={styles.bottomText}>Reset Score</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Visual Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0716",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  /* Menu Layout */
  menuCard: {
    backgroundColor: "rgba(26, 16, 43, 0.9)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 28,
    alignItems: "center",
    maxWidth: 480,
    width: "100%",
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontSize: 44,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    marginBottom: 20,
    marginTop: 4,
  },
  subtitleLarge: {
    fontSize: 18,
  },

  menuBtn: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  startBtn: {
    backgroundColor: "#7C3AED",
  },
  backBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  menuText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

  modeBox: {
    backgroundColor: "#130A24",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.3)",
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  modeTitle: {
    color: "#A78BFA",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modeOption: {
    flex: 1,
    backgroundColor: "#22103A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeActive: {
    backgroundColor: "#5B21B6",
    borderColor: "#A78BFA",
  },
  modeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  /* In-Game Navigation & Header */
  topNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerBackBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  headerBackText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  modeBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.4)",
  },
  modeBadgeText: {
    color: "#DDD6FE",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Scoreboard */
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: "#1A102B",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  scoreValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },

  status: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  statusLarge: {
    fontSize: 24,
  },

  /* Board & Grid Cells */
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
    backgroundColor: "#160C26",
    borderRadius: 22,
    padding: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cell: {
    backgroundColor: "#25143E",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  symbol: {
    fontSize: 36,
    fontWeight: "900",
  },
  symbolLarge: {
    fontSize: 52,
  },
  xColor: {
    color: "#38BDF8",
  },
  oColor: {
    color: "#F472B6",
  },

  /* Bottom Control Buttons */
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: "#4C1D95",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  resetBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  /* TV Focus Effect */
  focusBtn: {
    borderColor: "#FACC15",
    transform: [{ scale: 1.04 }],
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  cellFocus: {
    borderColor: "#FACC15",
    backgroundColor: "#3B1967",
    transform: [{ scale: 1.05 }],
    elevation: 8,
  },
});