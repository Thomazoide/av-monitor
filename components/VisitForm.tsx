import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useUserInputs } from "@/context/UserInputsContext";
import { ScrollView, StyleSheet } from "react-native";



export default function VisitForm() {
    const { supervisor, vehicle } = useUserInputs();

    return(
        supervisor &&
        <ScrollView style={styles.scrollBody} >
            <ThemedView style={styles.row}>
                <ThemedText style={styles.title}>
                    {supervisor.fullName}
                </ThemedText>
            </ThemedView>
            <ThemedView style={styles.row}>
            </ThemedView>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollBody: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        backgroundColor: 'white'
    },
    title: {
        textAlign: 'left',
        marginBottom: 2,
        marginTop: 2
    },
    subtitle: {
        opacity: 0.7,
        marginBottom: 16
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});