// Player Club Layout
import { Stack } from 'expo-router';
import { COLORS } from '../../../src/utils/constants';

export default function PlayerClubLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
