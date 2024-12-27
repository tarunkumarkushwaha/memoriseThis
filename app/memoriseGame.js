import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Animated, Image } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation } from "@react-navigation/native";

export default function App() {
    const [gameSequence, setGameSequence] = useState([]);
    const [userSequence, setUserSequence] = useState([]);
    const [level, setLevel] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [activeColor, setActiveColor] = useState(null);
    const colors = ['green', 'red', 'yellow', 'blue'];
    const animation = new Animated.Value(1);

    const navigation = useNavigation();
    const timeoutRef = useRef(null);

    const playSound = async (soundFile) => {
        const { sound } = await Audio.Sound.createAsync(soundFile);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    };

    const startGame = () => {
        resetGame();
        setGameStarted(true);
        nextRound();
    };

    const resetGame = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null; 
          }
        handleColorPress("orange")
        setGameSequence([]);
        setUserSequence([]);
        setLevel(0);
        setGameStarted(false);
        setActiveColor(null);
        animation.stopAnimation(); 
        animation.setValue(1);
    };

    const nextRound = () => {
        setUserSequence([]);
        setLevel((prevLevel) => prevLevel + 1);
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setGameSequence((prevSequence) => [...prevSequence, randomColor]);
    };

    const handleColorPress = (color) => {
        if (!gameStarted) return;

        playSound(require('../assets/music/click.mp3'));
        setUserSequence((prevSequence) => {
            const newSequence = [...prevSequence, color];

            if (newSequence[newSequence.length - 1] !== gameSequence[newSequence.length - 1]) {
                playSound(require('../assets/music/gameover.mp3'));
                Alert.alert('Game Over');
                setGameStarted(false);
                return prevSequence;
            }

            if (newSequence.length === gameSequence.length) {
                playSound(require('../assets/music/next.mp3'));
                timeoutRef.current = setTimeout(nextRound, 1000); 
            }

            return newSequence;
        });
    };

    const animateButton = (color) => {
        setActiveColor(color);
        Animated.sequence([
            Animated.timing(animation, {
                toValue: 1.2,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.timing(animation, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start(() => setActiveColor(null));
    };

    useEffect(() => {
        if (gameStarted && gameSequence.length > 0) {
            (async () => {
                for (let i = 0; i < gameSequence.length; i++) {
                    const color = gameSequence[i];
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    animateButton(color);
                    playSound(require('../assets/music/click.mp3'));
                }
            })();
        }
    }, [gameSequence]);

    return (
        <View style={styles.container}>
            {gameStarted ? (
                <>
                    <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate("index")}>
                        <Text style={styles.startButtonText}>Back to Menu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
                        <Text style={styles.resetButtonText}>Reset Game</Text>
                    </TouchableOpacity>

                    <View style={styles.board}>
                        {colors.map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.button,
                                    styles[color],
                                    activeColor === color && styles.activeButton,
                                ]}
                                onPress={() => handleColorPress(color)}
                            >
                                <Animated.View
                                    style={{ transform: [{ scale: activeColor === color ? animation : 1 }] }}
                                />
                            </TouchableOpacity>
                        ))}

                        <View style={styles.levelBox}>
                            <Text style={styles.levelText}>Level {level}</Text>
                        </View>
                    </View>

                </>
            ) : (<>
                <Image
                    source={{
                        uri: "https://cdn.pixabay.com/photo/2015/11/05/10/12/ball-1023985_960_720.png",
                    }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
                <View style={styles.container2}>


                    <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate("index")}>
                        <Text style={styles.startButtonText}>Back to Menu</Text>
                    </TouchableOpacity>

                    <View style={styles.rulesContainer}>
                        <Text style={styles.rulesTitle}>Game Rules:</Text>
                        <Text style={styles.rulesText}>1. Watch the sequence of lights carefully.</Text>
                        <Text style={styles.rulesText}>2. Repeat the sequence by tapping the buttons in the same order.</Text>
                        <Text style={styles.rulesText}>3. The sequence gets longer after each round.</Text>
                        <Text style={styles.rulesText}>4. If you tap the wrong button, the game is over!</Text>
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={startGame}>
                        <Text style={styles.startButtonText}>Start Game</Text>
                    </TouchableOpacity>
                </View>
            </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // justifyContent: 'center',
        gap: 10,
        alignItems: 'center',
        backgroundColor: '#f7e8fa',
    },
    container2: {
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: 'center',
        gap: 10,
        alignItems: 'center',
    },
    levelBox: {
        marginTop: 100,
    },
    levelText: {
        fontSize: 28,
        fontWeight: 'bolder',
    },
    board: {
        width: 300,
        height: 300,
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    button: {
        width: 130,
        height: 130,
        borderRadius: 15,
        margin: 10,
    },
    green: {
        backgroundColor: '#4CAF50',
    },
    red: {
        backgroundColor: '#FF5252',
    },
    yellow: {
        backgroundColor: '#FFEB3B',
    },
    blue: {
        backgroundColor: '#42A5F5',
    },
    activeButton: {
        opacity: 0.5,
    },
    startButton: {
        padding: 15,
        margin: 10,
        backgroundColor: '#3d0532',
        borderRadius: 10,
        marginTop: 100,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resetButton: {
        padding: 15,
        margin: 10,
        marginBottom: 80,
        backgroundColor: '#800313',
        borderRadius: 10,
    },
    backgroundImage: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: "100%",
        opacity: 0.7,
    },
    rulesContainer: {
        marginTop: 20,
        padding: 20,
        backgroundColor: "#ead1f0",
        borderRadius: 10,
        width: "90%",
        elevation: 5,
    },
    rulesTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
        textAlign: "center",
    },
    rulesText: {
        fontSize: 16,
        color: "#555",
        marginVertical: 5,
    },
});

