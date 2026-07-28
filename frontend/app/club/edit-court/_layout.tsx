// Edit Court Layout - Stack Navigation
import { Stack } from 'expo-router';

export default function EditCourtLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[courtId]" />
    </Stack>
  );
}
