import { StyleSheet, Text, View } from 'react-native';

export default function YouScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
  },
});
