import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const games = [
    { id: '1', name: 'Memorise Game', route: 'memoriseGame', description: 'Test your memory with Simon.' ,image:require('../assets/images/color.png') },
    { id: '2', name: 'Craco Dentist', route: 'CracoTeethGane', description: 'remove the incorrect teeth.' ,image:require('../assets/images/craco.png') },
];

export default function GameList() {
    const navigation = useNavigation();

    const handleBackToHome = () => {
        navigation.navigate('index');
    };

    const renderGame = ({ item }) => (
        <TouchableOpacity
            style={styles.gameCard}
            onPress={() => navigation.navigate(item.route)}
        >
            <Image
                source={item.image}
                style={styles.gameCardImage}
                resizeMode="cover"
            />
            <Text style={styles.gameTitle}>{item.name}</Text>
            <Text style={styles.gameDescription}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/images/dice.jpg')}
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
            <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
                <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
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
    gameCardImage: {
        opacity:0.5,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    gameCard: {
        overflow:"hidden",
        backgroundColor: "#292a2e",
        borderWidth: 2,
        borderColor: 'black',
        borderStyle: 'solid',
        borderRadius: 10,
        marginVertical: 10,
        width: "100%",
    },
    gameTitle: {
        padding: 10,
        fontSize: 25,
        textAlign:"center",
        fontWeight: 'bold',
        color: '#ffffff',
    },
    gameDescription: {
        padding: 5,
        fontSize: 14,
        textAlign:"center",
        color: '#ffffff',
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
    backButton: {
        padding: 15,
        margin: 10,
        backgroundColor: '#3d0532',
        borderRadius: 10,
        marginTop: 20,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
