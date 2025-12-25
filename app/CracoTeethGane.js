import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';

const CracoTeethGame = () => {
  const [noOfTeeth, setNoOfTeeth] = useState(2);
  const [loserNumber, setLoserNumber] = useState(null);
  const [game, setGame] = useState(false);
  const [lose, setLose] = useState(false);
  const [win, setWin] = useState(false);
  const [winNo, setWinNo] = useState([]);
  const ref = useRef(null);

  const numArr = Array.from({ length: noOfTeeth }, (_, i) => i + 1);

  const startGame = () => {
    if (lose || win || game) {
      resetGame();
      return;
    }
    setGame(true);
    const randomLoser = Math.floor(Math.random() * noOfTeeth) + 1;
    setLoserNumber(randomLoser);
    console.log("Loser number is:", randomLoser);
  };

  const resetGame = () => {
    setNoOfTeeth(2);
    setLoserNumber(null);
    setGame(false);
    setLose(false);
    setWin(false);
    setWinNo([]);
  };

  const clickHandler = (number) => {
    if (number !== loserNumber) {
      if (!winNo.includes(number)) {
        setWinNo([...winNo, number]);
      }
    } else {
      setLose(true);
      Alert.alert("Game Over", "You lost!");
    }
  };

  useEffect(() => {
    if (game && winNo.length === noOfTeeth - 1) {
      setWin(true);
      setGame(false);
      Alert.alert("Congratulations!", "You won the game!");
    }
  }, [winNo]);

  const renderTeeth = () => {
    return numArr.map((item, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => clickHandler(item)}
        disabled={lose}
        style={[
          styles.teeth,
          winNo.includes(item) && styles.teethWin,
          item === loserNumber && lose && styles.teethLose,
        ]}
      >
        <Text style={styles.teethText}>{item}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/craco.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <Text style={styles.title}>Craco Teeth Game</Text>
      {!game && !lose && !win && (
        <View style={styles.setting}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => noOfTeeth > 2 && setNoOfTeeth(noOfTeeth - 1)}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.teethCount}>{noOfTeeth}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => noOfTeeth < 32 && setNoOfTeeth(noOfTeeth + 1)}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
      {game && (
        <View style={styles.container}>
          {/* Crocodile Head */}
          <View style={styles.crocodileContainer}>
            <Image
              source={require('../assets/images/mouthopen.png')}
              style={styles.zoomedHead}
              resizeMode="cover"
            />
          </View>

          {/* Mouth */}
          <View style={styles.mouth}>
            {/* Teeth */}
            <View style={styles.teethContainer}>{renderTeeth()}</View>
          </View>
          {/* </View> */}
        </View>)
      }
      <TouchableOpacity style={styles.startButton} onPress={startGame}>
        <Text style={styles.startButtonText}>{game || win ? "Reset" : "Start"}</Text>
      </TouchableOpacity>
      {lose && <Text style={styles.status}>You Lost!</Text>}
      {win && <Text style={styles.status}>You Win!</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  crocodileContainer: {
    overflow: "hidden",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  zoomedHead: {
    transform: [
      { scale: 1 },
      { translateX: 170 },
      { translateY: -30 },
    ],
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#150b2eff',
    marginBottom: 20,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 18,
    color: '#155724',
  },
  teethCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  head: {
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  mouth: {
    width: 200,
    height: 150,
    position: "absolute",
    bottom: 120,
    left:50,
    justifyContent: "center",
    alignItems: "center",
  },
  teethContainer: {
    position: "absolute",
    top: -50, // Align teeth inside the mouth
    flexDirection: "row",
    width: "100%",
  },
  teeth: {
    width: 25,
    height: 40,
    backgroundColor: "white",
    margin: 2,
    borderRadius: 2,
  },
  lowerLip: {
    width: 200,
    height: 70,
    backgroundColor: "red",
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    position: "absolute",
    bottom: 0,
    borderWidth: 5,
    borderColor: "#236b22",
  },
  teethWin: {
    backgroundColor: '#4caf50',
  },
  teethLose: {
    backgroundColor: '#f44336',
  },
  teethText: {
    fontSize: 18,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff5722',
    marginTop: 20,
  },
});

export default CracoTeethGame;
