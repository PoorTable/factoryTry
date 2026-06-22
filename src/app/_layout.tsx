import '../global.css';

import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AiProvider } from '@/services/ai/client';
import { initAiRuntime } from '@/services/ai/runtime/executorch';

// App entry: wire the ExecuTorch resource fetcher exactly once, before any
// screen mounts (per the upstream RNE Expo docs:
// `initExecutorch({ resourceFetcher: ExpoResourceFetcher })`). Runs at module
// scope so the capability probe in `AiProvider` reads a settled state. Fails
// closed — on web / Expo Go this records "unavailable" without throwing.
initAiRuntime();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    JetBrainsMono_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AiProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </AiProvider>
    </ThemeProvider>
  );
}
