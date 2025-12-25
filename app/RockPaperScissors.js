import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import { FaHandPaper } from "react-icons/fa";
import { FaScissors } from "react-icons/fa6";
import { GiStoneSphere } from "react-icons/gi";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";

const CHOICES = ["rock", "paper", "scissors"];
const VALUES = { rock: -1, paper: 0, scissors: 1 };

export default function RockPaperScissors() {
    const [result, setResult] = useState("");
    const [player, setPlayer] = useState("");
    const [computer, setComputer] = useState("");
    const [score, setScore] = useState({ win: 0, lose: 0, draw: 0 });
    const [difficulty, setDifficulty] = useState("easy");

    const scaleAnim = new Animated.Value(1);
    const shakeAnim = new Animated.Value(0);

    const navigation = useNavigation();

    let trueSound = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_b8c9103636.mp3?filename=correct-83487.mp3";
    let falseSound = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative_beeps-6008.mp3";

    const playSound = async (type) => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                {
                    uri: type === "win" ? trueSound : falseSound,
                },
                { shouldPlay: true }
            );

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.log("Sound error:", error);
        }
    };

    const resetGame = () => {
        setResult("");
        setPlayer("");
        setComputer("");
        setScore({ win: 0, lose: 0, draw: 0 });
    };



    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const loseAnimation = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 60,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 60,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 60,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const biasedComputerChoice = (playerChoice) => {
        if (difficulty === "easy") {
            return CHOICES[Math.floor(Math.random() * 3)];
        }
        // Danger MODE → computer tries to win
        if (playerChoice === "rock") return "paper";
        if (playerChoice === "paper") return "scissors";
        return "rock";
    };

    const playGame = async (choice) => {
        animatePress();

        const computerChoice = biasedComputerChoice(choice);
        const resultValue = VALUES[choice] - VALUES[computerChoice];

        setPlayer(choice);
        setComputer(computerChoice);

        if (resultValue === 0) {
            setResult("Draw");
            setScore((s) => ({ ...s, draw: s.draw + 1 }));
        } else if (resultValue === 1 || resultValue === -2) {
            setResult("You Win");
            setScore((s) => ({ ...s, win: s.win + 1 }));
            await playSound("win");
        } else {
            setResult("You Lose");
            setScore((s) => ({ ...s, lose: s.lose + 1 }));
            loseAnimation();
            await playSound("lose");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Rock Paper Scissors</Text>

            <TouchableOpacity
                onPress={() =>
                    setDifficulty(difficulty === "easy" ? "Danger" : "easy")
                }
                style={styles.diffBtn}
            >
                <Text style={styles.diffText}>
                    Difficulty: {difficulty.toUpperCase()}
                </Text>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.row}>
                {CHOICES.map((item) => (
                    <Animated.View
                        key={item}
                        style={{
                            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
                        }}
                    >
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => playGame(item)}
                        >
                            {
                                {
                                    rock: <GiStoneSphere size={40} color="#38bdf8" />,
                                    paper: <FaHandPaper size={40} color="#38bdf8" />,
                                    scissors: <FaScissors size={40} color="#38bdf8" />,
                                }[item]
                            }

                            <Text style={styles.label}>{item}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>

            {/* Result */}
            {result !== "" && (
                <View style={styles.resultBox}>
                    <Text style={styles.result}>{result}</Text>
                    <Text style={styles.info}>You: {player}</Text>
                    <Text style={styles.info}>Computer: {computer}</Text>
                </View>
            )}

            {/* Score */}
            <View style={styles.scoreBox}>
                <Text style={styles.score}>Win: {score.win}</Text>
                <Text style={styles.score}>Lose: {score.lose}</Text>
                <Text style={styles.score}>Draw: {score.draw}</Text>
            </View>



            

            <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
             
                <Text style={styles.resetText}>Reset Game</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={() => {

                navigation.navigate("gamelist");
            }}>
                <Text style={styles.resetText}>Back to Menu</Text>
            </TouchableOpacity>

        </View>
    );
}



const styles = StyleSheet.create({
    resetBtn: {
        marginTop: 25,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#38bdf8",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
    },
    resetText: {
        fontWeight: "bold",
        color: "#020617",
    },

    container: {
        flex: 1,
        backgroundColor: "#020617",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    title: {
        color: "#38bdf8",
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 20,
    },
    diffBtn: {
        margin: 15,
        backgroundColor: "#1e293b",
        padding: 8,
        borderRadius: 8,
    },
    diffText: {
        color: "#e5e7eb",
    },
    row: {
        flexDirection: "row",
        gap: 14,
    },
    card: {
        backgroundColor: "#0f172a",
        width: 90,
        height: 110,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        color: "#cbd5f5",
        marginTop: 6,
        textTransform: "capitalize",
    },
    resultBox: {
        marginTop: 20,
        alignItems: "center",
    },
    result: {
        fontSize: 22,
        color: "#facc15",
        fontWeight: "bold",
    },
    info: {
        color: "#cbd5f5",
    },
    scoreBox: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    score: {
        color: "#e5e7eb",
    },
});

