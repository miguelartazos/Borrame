import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, radii } from '../src/ui/tokens';
import { useIndexStore } from '../src/store/useIndexStore';
import { useDeckStore } from '../src/store/useDeckStore';
import { usePendingStore } from '../src/store/usePendingStore';
import { useGoalStore } from '../src/store/useGoalStore';
import { useSettings } from '../src/store/useSettings';
import { usePermissions } from '../src/store/usePermissions';

// Configuration for mock values
const DEBUG_CONFIG = {
  HIGH_STATS: {
    minutes: 30,
    freedMB: 375.5,
  },
  PERMISSION_STATES: ['granted', 'limited', 'undetermined'] as const,
  MOCK_ACTIVITY: {
    minutes: 30,
    megabytes: 375.5,
  },
} as const;

type PermissionStatus = 'undetermined' | 'limited' | 'granted';

function isValidPermissionStatus(value: string): value is PermissionStatus {
  return ['undetermined', 'limited', 'granted'].includes(value);
}

interface DebugToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
}

function DebugToggle({ label, value, onValueChange, description }: DebugToggleProps) {
  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleContent}>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {description && <Text style={styles.toggleDescription}>{description}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.surface, true: colors.primaryMuted }}
          thumbColor={value ? colors.primary : colors.textSecondary}
        />
      </View>
    </View>
  );
}

interface DebugSectionProps {
  title: string;
  children: React.ReactNode;
}

function DebugSection({ title, children }: DebugSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

interface StateDisplayProps {
  permissionState: string;
  isOffline: boolean;
  pendingCount: number;
  streak: number;
  todayMinutes: number;
  todayFreedMB: number;
}

function StateDisplay({
  permissionState,
  isOffline,
  pendingCount,
  streak,
  todayMinutes,
  todayFreedMB,
}: StateDisplayProps) {
  return (
    <View style={styles.stateDisplay}>
      <Text style={styles.sectionTitle}>CURRENT STATE</Text>

      <View style={styles.stateRow}>
        <Text style={styles.stateLabel}>
          Permission: <Text style={styles.stateValue}>{permissionState}</Text>
        </Text>
      </View>

      <View style={styles.stateRow}>
        <Text style={styles.stateLabel}>
          Network: <Text style={styles.stateValue}>{isOffline ? 'Offline' : 'Online'}</Text>
        </Text>
      </View>

      <View style={styles.stateRow}>
        <Text style={styles.stateLabel}>
          Pending Items: <Text style={styles.stateValue}>{pendingCount}</Text>
        </Text>
      </View>

      <View style={styles.stateRow}>
        <Text style={styles.stateLabel}>
          Streak: <Text style={styles.stateValue}>{streak} days</Text>
        </Text>
      </View>

      <View>
        <Text style={styles.stateLabel}>
          Today's Progress:{' '}
          <Text style={styles.stateValue}>
            {todayMinutes} min, {todayFreedMB.toFixed(1)} MB freed
          </Text>
        </Text>
      </View>
    </View>
  );
}

export default function DebugHome() {
  if (!__DEV__) {
    return null;
  }
  const router = useRouter();
  const settings = useSettings();
  const indexStore = useIndexStore();
  const deckStore = useDeckStore();
  const pendingStore = usePendingStore();
  const goalStore = useGoalStore();
  const permissions = usePermissions();

  // Mock states
  const [isOffline, setIsOffline] = useState(settings.isOffline());
  const [permissionState, setPermissionState] = useState<PermissionStatus>(permissions.getStatus());
  const [mockEmptyLibrary, setMockEmptyLibrary] = useState(false);
  const [mockLoading, setMockLoading] = useState(settings.isLoading());
  const [mockError, setMockError] = useState(settings.hasError());
  const [showPaywall, setShowPaywall] = useState(false);
  const [mockLargeDataset, setMockLargeDataset] = useState(false);

  // Connect mock states to stores
  useEffect(() => {
    settings.setDebugOverrides({
      offline: isOffline,
      loading: mockLoading,
      error: mockError,
    });
  }, [isOffline, mockLoading, mockError, settings]);

  useEffect(() => {
    if (isValidPermissionStatus(permissionState)) {
      permissions.setDebugOverride(permissionState);
    }
  }, [permissionState, permissions]);

  useEffect(() => {
    if (mockEmptyLibrary) {
      indexStore.setDebugOverrides({
        total: 0,
        indexed: 0,
        running: false,
        paused: false,
      });
    } else if (mockLargeDataset) {
      indexStore.setDebugOverrides({
        total: 10000,
        indexed: 5000,
        running: true,
        paused: false,
      });
    } else {
      indexStore.setDebugOverrides(undefined);
    }
  }, [mockEmptyLibrary, mockLargeDataset, indexStore]);

  // Helper to reset all stores
  const resetAllStores = () => {
    try {
      // Reset index store
      indexStore.resetRunState();
      indexStore.setDebugOverrides(undefined);

      // Reset deck store
      deckStore.resetDeck();
      deckStore.setFilter('all');

      // Reset pending store
      pendingStore.setPendingCount(0);

      // Reset goal store
      goalStore.resetDailyProgress();

      // Reset debug overrides
      settings.setDebugOverrides(undefined);
      permissions.setDebugOverride(undefined);

      // Reset local state
      setIsOffline(false);
      setMockLoading(false);
      setMockError(false);
      setMockEmptyLibrary(false);
      setMockLargeDataset(false);
      setPermissionState('granted');

      Alert.alert('Success', 'All stores have been reset');
    } catch (error) {
      console.error('Error resetting stores:', error);
      Alert.alert('Error', 'Failed to reset stores');
    }
  };

  const clearPendingBin = () => {
    try {
      pendingStore.setPendingCount(0);
      Alert.alert('Success', 'Pending bin cleared');
    } catch (error) {
      console.error('Error clearing pending bin:', error);
      Alert.alert('Error', 'Failed to clear pending bin');
    }
  };

  const setHighStats = () => {
    try {
      goalStore.recordActivity(
        DEBUG_CONFIG.MOCK_ACTIVITY.minutes,
        DEBUG_CONFIG.MOCK_ACTIVITY.megabytes
      );
      goalStore.updateStreak();
      Alert.alert(
        'Success',
        `Added ${DEBUG_CONFIG.MOCK_ACTIVITY.minutes} minutes and ${DEBUG_CONFIG.MOCK_ACTIVITY.megabytes} MB`
      );
    } catch (error) {
      console.error('Error setting high stats:', error);
      Alert.alert('Error', 'Failed to set high stats');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Debug Home</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Network States */}
        <DebugSection title="NETWORK STATES">
          <DebugToggle
            label="Offline Mode"
            value={isOffline}
            onValueChange={setIsOffline}
            description="Simulate no network connection"
          />
        </DebugSection>

        {/* Permission States */}
        <DebugSection title="PERMISSION STATES">
          <View style={styles.segmentedControl}>
            {DEBUG_CONFIG.PERMISSION_STATES.map((state) => (
              <Pressable
                key={state}
                onPress={() => {
                  if (isValidPermissionStatus(state)) {
                    setPermissionState(state);
                  } else {
                    Alert.alert('Error', `Invalid permission state: ${state}`);
                  }
                }}
                style={[
                  styles.segmentedButton,
                  permissionState === state && styles.segmentedButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    permissionState === state && styles.segmentedButtonTextActive,
                  ]}
                >
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </DebugSection>

        {/* Data States */}
        <DebugSection title="DATA STATES">
          <DebugToggle
            label="Empty Library"
            value={mockEmptyLibrary}
            onValueChange={setMockEmptyLibrary}
            description="Show empty state with no photos"
          />
          <DebugToggle
            label="Loading State"
            value={mockLoading}
            onValueChange={setMockLoading}
            description="Show loading indicators"
          />
          <DebugToggle
            label="Error State"
            value={mockError}
            onValueChange={setMockError}
            description="Simulate API/database errors"
          />
          <DebugToggle
            label="Large Dataset"
            value={mockLargeDataset}
            onValueChange={setMockLargeDataset}
            description="Test with 10,000+ photos"
          />
        </DebugSection>

        {/* Feature Flags */}
        <DebugSection title="FEATURE FLAGS">
          <DebugToggle
            label="Show Paywall"
            value={showPaywall}
            onValueChange={setShowPaywall}
            description="Force paywall to appear"
          />
          <DebugToggle
            label="Haptic Feedback"
            value={settings.hapticFeedback}
            onValueChange={(value) => settings.setHapticFeedback(value)}
            description="Enable/disable haptic feedback"
          />
        </DebugSection>

        {/* Quick Actions */}
        <DebugSection title="QUICK ACTIONS">
          <Pressable onPress={resetAllStores} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Reset All Stores</Text>
          </Pressable>

          <Pressable onPress={clearPendingBin} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Clear Pending Bin</Text>
          </Pressable>

          <Pressable onPress={setHighStats} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Set High Stats</Text>
          </Pressable>
        </DebugSection>

        {/* Current State Display */}
        <StateDisplay
          permissionState={permissionState}
          isOffline={isOffline}
          pendingCount={pendingStore.pendingCount}
          streak={goalStore.currentStreak}
          todayMinutes={goalStore.todayMinutes}
          todayFreedMB={goalStore.todayFreedMB}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  toggleContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.lg,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    borderRadius: radii.md - 4,
    alignItems: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentedButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentedButtonTextActive: {
    color: colors.bg,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
  stateDisplay: {
    marginTop: spacing['2xl'],
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  stateRow: {
    marginBottom: spacing.sm,
  },
  stateLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  stateValue: {
    color: colors.textPrimary,
  },
});
