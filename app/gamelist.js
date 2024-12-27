import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const games = [
    { id: '1', name: 'Memorise Game', route: 'memoriseGame', description: 'Test your memory with Simon.' },
];

export default function GameList() {
    const navigation = useNavigation();

    const renderGame = ({ item }) => (
        <TouchableOpacity
            style={styles.gameCard}
            onPress={() => navigation.navigate(item.route)}
        >
            <Text style={styles.gameTitle}>{item.name}</Text>
            <Text style={styles.gameDescription}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Image
                source={{
                    uri: "https://cdn.pixabay.com/photo/2016/07/07/16/46/dice-1502706_960_720.jpg",
                }}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <Text style={styles.header}>Choose Your Game</Text>
            <FlatList
                data={games}
                renderItem={renderGame}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        backgroundColor: '#f4f4f9',
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginVertical: 20,
    },
    listContent: {
        paddingHorizontal: 20,
    },
    gameCard: {
        backgroundColor: "#edd3ed",
        borderWidth: 2,
        borderColor: 'black',
        borderStyle: 'solid',
        borderRadius: 10,
        padding: 15,
        marginVertical: 10,
        elevation: 5,
        width: "90vw",
    },
    gameTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    gameDescription: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
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
});
