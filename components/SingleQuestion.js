import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SingleQuestion = ({ question, response, setresponse, disabled }) => {
  const responseHandler = (value) => {
    setresponse(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.question}</Text>

      <View style={styles.optionContainer}>
        {['option1', 'option2', 'option3', 'option4'].map((option, index) => {
          const optionLabel = question[option];
          const isCorrect = question.correctresponse === optionLabel;
          const isSelected = response === optionLabel;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => responseHandler(optionLabel)}
              disabled={disabled}
              style={[styles.option, isSelected && styles.selectedOption]}
            >
              <Text style={[
                styles.optionText,
                disabled ? (isCorrect ? styles.correctText : styles.incorrectText) : styles.defaultText
              ]}>
                {`${String.fromCharCode(97 + index)}. ${optionLabel}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7CFC00',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionContainer: {
    width: '90vw',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D3D3D3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#98FB98',
  },
  optionText: {
    fontSize: 18,
    color: '#333',
  },
  correctText: {
    color: 'green',
  },
  incorrectText: {
    color: 'red',
  },
  defaultText: {
    color: '#32CD32',
  },
});

export default SingleQuestion;
