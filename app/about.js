import { Image, StyleSheet } from "react-native";
import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function AboutScreen() {
    const navigation = useNavigation();

    const features = [
        'No ads',
        'Wide variety of games',
        'Intuitive and interactive UI',
        'Regular updates with new content',
    ];

    return (
        <View style={styles.mainContainer}>
            <Image
                source={{
                    uri: "https://cdn.pixabay.com/photo/2017/08/30/11/46/galaxy-2695569_960_720.jpg",
                }}
                style={styles.backgroundImage}
                resizeMode="cover"
            />

            <View style={styles.overlay} />

            <View style={styles.contentContainer}>
                <Text style={styles.title}>About Game Box</Text>
                <Text style={styles.description}>
                    Welcome to Game Box, your ultimate destination for fun and engaging games! Our app
                    offers a curated selection of games designed to entertain, challenge, and inspire players of all ages.
                </Text>

                <Text style={styles.featuresTitle}>Key Features:</Text>
                <FlatList
                    data={features} // Use the features array
                    renderItem={({ item }) => (
                        <Text style={styles.featureItem}>- {item}</Text>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                />

                {/* <Text style={styles.missionTitle}>Our Mission:</Text> */}
                {/* <Text style={styles.description}>
          At Game Box, we strive to create an immersive gaming experience that brings joy and excitement to your fingertips.
        </Text> */}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
   
    mainContainer: {
        display:"flex",
        paddingTop:100,
        justifyContent: "center",
        alignItems: "center",
    },
    backgroundImage: {
        position: "absolute",
        zIndex:2,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: "100%",
        opacity: 0.7,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    }
    ,
    contentContainer: {
        padding: 20,
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFD700",
        textAlign: "center",
        marginBottom: 20,
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    description: {
        fontSize: 16,
        color: "white",
        textAlign: "center",
        marginBottom: 15,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    featuresTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFD700",
        textAlign: "center",
        marginTop: 20,
        marginBottom: 10,
    },
    featureItem: {
        fontSize: 16,
        color: "white",
        textAlign: "center",
        marginBottom: 2,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    missionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFD700",
        textAlign: "center",
        marginTop: 20,
        marginBottom: 10,
    },
    buttonContainer: {
        position: "absolute",
        bottom: 50,
        alignSelf: "center",
    },
    backButton: {
        padding: 15,
        backgroundColor: "#333333",
        borderRadius: 25,
        paddingHorizontal: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});
