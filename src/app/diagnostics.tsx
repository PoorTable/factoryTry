import { cssInterop } from 'nativewind';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getExecutorchDiagnostics,
  type ExecutorchDiagnostics,
} from '@/services/ai/runtime/executorch';

// SafeAreaView is not NativeWind-aware by default; map className → style so
// this screen stays className-only (AGENTS.md strict styling rule).
cssInterop(SafeAreaView, { className: 'style' });

/**
 * On-device AI runtime diagnostics (APP-40 AC #4).
 *
 * The durable proof artifact: on a physical device running a custom dev client
 * (with `EXPO_PUBLIC_AI_MOCK` unset), this screen reports whether the
 * ExecuTorch native module is actually linked and its runtime version. On web
 * / Expo Go it reports the fail-closed "unavailable" state instead — never a
 * fabricated "ready". Reachable at the `/diagnostics` route.
 */
export default function DiagnosticsScreen() {
  const [diag, setDiag] = useState<ExecutorchDiagnostics>(() => getExecutorchDiagnostics());
  const refresh = useCallback(() => setDiag(getExecutorchDiagnostics()), []);

  const statusLabel = diag.available ? 'LINKED' : 'UNAVAILABLE';
  const statusClass = diag.available
    ? 'bg-[#7A8454] text-paper'
    : 'bg-[#8A4426] text-paper';

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="px-screen-h py-6 gap-5">
        <View className="gap-1">
          <Text className="font-serif text-3xl text-ink">On-device AI</Text>
          <Text className="font-sans text-sm text-muted">
            ExecuTorch runtime diagnostics
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Text className="font-sans-medium text-base text-ink-soft">Status</Text>
          <View className={`rounded-pill px-3 py-1 ${statusClass}`}>
            <Text className="font-mono text-xs text-paper">{statusLabel}</Text>
          </View>
        </View>

        <View className="rounded-card border border-hairline bg-paper-2 p-4 gap-3">
          <DiagRow label="Native module linked" value={diag.nativeModuleLinked ? 'yes' : 'no'} />
          <DiagRow label="initExecutorch ran" value={diag.initialized ? 'yes' : 'no'} />
          <DiagRow label="Platform" value={diag.platform} />
          <DiagRow label="Runtime version" value={diag.runtimeVersion ?? '—'} />
        </View>

        {diag.error ? (
          <View className="rounded-card border border-[#8A4426] bg-mist p-4">
            <Text className="font-sans-medium text-sm text-cognac-deep">Why unavailable</Text>
            <Text className="font-sans text-sm text-ink-soft mt-1">{diag.error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          className="rounded-pill bg-cognac active:bg-cognac-deep px-5 py-3 self-start"
        >
          <Text className="font-sans-medium text-sm text-paper">Re-check runtime</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans text-sm text-ink-soft">{label}</Text>
      <Text className="font-mono text-sm text-ink">{value}</Text>
    </View>
  );
}
