import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trash2, RotateCcw, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLimitsStore } from '../../src/features/limits/useLimitsStore';
import {
  getPendingAssets,
  getPendingSpaceEstimate,
  removePendingIntents,
  restoreAllPending,
  getPendingCount,
  type PendingAsset,
} from '../../src/features/pending/selectors';
import { useSetPendingCount, useRefreshSpaceEstimate } from '../../src/store/usePendingStore';
import {
  buildCommitPreview,
  executeCommit,
  showCommitConfirmation,
} from '../../src/features/pending/commitFlow';
import { PaywallModal } from '../../src/features/paywall/PaywallModal';
import { formatBytes, formatDate } from '../../src/lib/formatters';
import { analytics } from '../../src/lib/analytics';
import { 
  checkDeletionPermissions, 
  showPermissionErrorAlert 
} from '../../src/features/permissions/mediaLibraryHelpers';
import { logger } from '../../src/lib/logger';

const PAGE_SIZE = 50;

export default function PendingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [assets, setAssets] = useState<PendingAsset[]>([]);
  const [spaceEstimate, setSpaceEstimate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const offsetRef = useRef(0);

  const remainingToday = useLimitsStore((s) => s.remainingToday);
  const isPro = useLimitsStore((s) => s.isPro);
  const loadLimits = useLimitsStore((s) => s.loadLimits);
  const setPendingCount = useSetPendingCount();
  const refreshSpaceEstimate = useRefreshSpaceEstimate();

  const loadPendingAssets = useCallback(
    async (append = false) => {
      if (!append) {
        setAssets([]);
        setHasMore(true);
        offsetRef.current = 0;
      }

      try {
        const offset = append ? offsetRef.current : 0;
        const [pendingAssets, space] = await Promise.all([
          getPendingAssets(PAGE_SIZE, offset),
          append ? Promise.resolve(spaceEstimate) : getPendingSpaceEstimate(),
        ]);

        if (append) {
          setAssets((prev) => [...prev, ...pendingAssets]);
          offsetRef.current += pendingAssets.length;
        } else {
          setAssets(pendingAssets);
          setSpaceEstimate(space);
          offsetRef.current = pendingAssets.length;
        }

        setHasMore(pendingAssets.length === PAGE_SIZE);
      } catch (error) {
        // Silent fail; UI will show empty state or previous data
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [spaceEstimate]
  );

  useEffect(() => {
    loadLimits();
    loadPendingAssets(false);
    analytics.track('pending_opened');

    // Cleanup on unmount
    return () => {
      offsetRef.current = 0; // Reset offset when leaving screen
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(() => {
    // Prevent multiple concurrent loads
    if (loadingMore || !hasMore || loading) {
      return;
    }
    setLoadingMore(true);
    loadPendingAssets(true);
  }, [loadingMore, hasMore, loading, loadPendingAssets]);

  const handleRestoreItem = useCallback(
    async (assetId: string) => {
      try {
        await removePendingIntents([assetId]);
        await loadPendingAssets(false);
        // Update global pending store after restore
        const newCount = await getPendingCount();
        setPendingCount(newCount);
        refreshSpaceEstimate();
        analytics.track('pending_item_restored');
      } catch (error) {
        Alert.alert(t('common.error'), t('pending.restore.failed'));
      }
    },
    [loadPendingAssets, t, setPendingCount, refreshSpaceEstimate]
  );

  const handleRestoreAll = useCallback(async () => {
    Alert.alert(t('pending.restoreAll.title'), t('pending.restoreAll.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('pending.restoreAll'),
        style: 'destructive',
        onPress: async () => {
          try {
            await restoreAllPending();
            await loadPendingAssets(false);
            const newCount = await getPendingCount();
            setPendingCount(newCount);
            refreshSpaceEstimate();
            analytics.track('pending_all_restored');
          } catch (error) {
            Alert.alert(t('common.error'), t('pending.restoreAll.failed'));
          }
        },
      },
    ]);
  }, [loadPendingAssets, t, setPendingCount, refreshSpaceEstimate]);

  const handleCommit = useCallback(async () => {
    try {
      logger.info('User initiated commit');
      
      // Check permissions first
      const permissionCheck = await checkDeletionPermissions();
      if (!permissionCheck.hasPermission) {
        logger.error('Permission check failed:', permissionCheck.message);
        showPermissionErrorAlert(permissionCheck);
        analytics.track('commit_blocked_permissions', {
          isLimited: permissionCheck.isLimited,
          needsUpgrade: permissionCheck.needsUpgrade,
        });
        return;
      }
      
      const preview = await buildCommitPreview();

      if (!isPro && preview.eligibleToCommit === 0 && preview.pendingCount > 0) {
        setShowPaywall(true);
        analytics.track('limits_cap_hit');
        return;
      }

      if (preview.eligibleToCommit === 0) {
        return;
      }

      showCommitConfirmation(
        preview,
        async () => {
          setCommitting(true);
          try {
            const result = await executeCommit();

            if (result.permissionError) {
              logger.error('Commit failed due to permission error');
              // Re-check permissions to get detailed status
              const permissionRecheck = await checkDeletionPermissions();
              showPermissionErrorAlert(permissionRecheck);
            } else if (!result.success && result.message.includes('check app permissions')) {
              logger.error('Commit failed - likely permission issue');
              const permissionRecheck = await checkDeletionPermissions();
              showPermissionErrorAlert(permissionRecheck);
            } else {
              Alert.alert(
                result.success ? t('common.success') : t('common.partial'),
                result.message,
                [
                  {
                    text: t('common.ok'),
                    onPress: async () => {
                      await loadPendingAssets(false);
                      const newCount = await getPendingCount();
                      setPendingCount(newCount);
                      refreshSpaceEstimate();
                    },
                  },
                ]
              );
            }
          } catch (error) {
            Alert.alert(t('common.error'), (error as Error).message);
          } finally {
            setCommitting(false);
          }
        },
        () => {
          analytics.track('commit_canceled');
        }
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('pending.commit.failed'));
    }
  }, [isPro, loadPendingAssets, t, setPendingCount, refreshSpaceEstimate]);

  const renderItem = ({ item }: { item: PendingAsset }) => (
    <View className="flex-row items-center bg-white p-3 mb-2 mx-4 rounded-xl">
      <Image source={{ uri: item.uri }} className="w-16 h-16 rounded-lg" resizeMode="cover" />

      <View className="flex-1 ml-3">
        <Text className="text-gray-900 font-medium" numberOfLines={1}>
          {item.filename || 'Unnamed'}
        </Text>
        <Text className="text-gray-500 text-sm">{formatBytes(item.size_bytes, i18n.language)}</Text>
        <Text className="text-gray-400 text-xs">{formatDate(item.created_at, i18n.language)}</Text>
      </View>

      <Pressable
        className="p-2"
        onPress={() => handleRestoreItem(item.id)}
        accessibilityLabel={t('pending.restore')}
      >
        <RotateCcw size={20} color="#6b7280" />
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Trash2 size={32} color="#9ca3af" />
      </View>
      <Text className="text-xl font-semibold text-gray-900 mb-2">{t('pending.empty.title')}</Text>
      <Text className="text-gray-500 text-center">{t('pending.empty.subtitle')}</Text>
      <Pressable className="mt-6 px-6 py-3 bg-blue-500 rounded-xl" onPress={() => router.back()}>
        <Text className="text-white font-semibold">{t('pending.empty.goBack')}</Text>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <View className="bg-white border-b border-gray-200 px-4 py-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-lg font-semibold">
          {t('pending.selected', { count: assets.length })}
        </Text>
        {assets.length > 0 && (
          <Pressable onPress={handleRestoreAll}>
            <Text className="text-blue-500 font-medium">{t('pending.restoreAll')}</Text>
          </Pressable>
        )}
      </View>

      {spaceEstimate > 0 && (
        <Text className="text-gray-500 text-sm">
          {t('pending.spaceEstimate', {
            size: formatBytes(spaceEstimate, i18n.language),
          })}
        </Text>
      )}

      {!isPro && remainingToday < assets.length && (
        <View className="flex-row items-center mt-2 p-2 bg-yellow-50 rounded-lg">
          <AlertCircle size={16} color="#f59e0b" />
          <Text className="ml-2 text-yellow-700 text-sm flex-1">
            {t('limits.meter', { remaining: remainingToday })}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {renderHeader()}

        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={assets.length === 0 ? { flex: 1 } : {}}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPendingAssets(false);
              }}
            />
          }
        />

        {assets.length > 0 && (
          <View className="p-4 bg-white border-t border-gray-200">
            <Pressable
              className={`py-4 rounded-xl items-center ${
                committing ? 'bg-gray-300' : 'bg-red-500'
              }`}
              onPress={handleCommit}
              disabled={committing}
            >
              {committing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">{t('pending.commit.cta')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        triggerPoint="pending_limit"
      />
    </SafeAreaView>
  );
}
