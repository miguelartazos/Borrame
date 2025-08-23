import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';
import { theme } from '../../ui';

interface AlbumItem {
  id: string;
  title: string;
  assetCount: number;
  thumbUri?: string;
}

interface AlbumPickerSheetProps {
  visible: boolean;
  selectedId: string | null;
  onSelect: (id: string | null, title?: string | null) => void;
  onClose: () => void;
}

const SHEET_HEIGHT = 520;
const BACKDROP_OPACITY = 0.5;
const SPRING = { damping: 24, stiffness: 320, mass: 0.9 };

export function AlbumPickerSheet({ visible, selectedId, onSelect, onClose }: AlbumPickerSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const haptic = useSettings((s) => s.hapticFeedback);
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState<AlbumItem[]>([]);

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING);
      backdrop.value = withTiming(BACKDROP_OPACITY, { duration: 200 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, SPRING);
      backdrop.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdrop]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const systemAlbums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
        if (!mounted) return;
        const list = systemAlbums
          .filter((a) => (a.assetCount || 0) > 0)
          .map((a) => ({ id: String(a.id), title: a.title || 'Album', assetCount: a.assetCount || 0 }))
          .sort((a, b) => b.assetCount - a.assetCount);
        // Load one preview image per album (best-effort)
        const thumbs = await Promise.all(
          list.slice(0, 50).map(async (al) => {
            try {
              const res = await MediaLibrary.getAssetsAsync({
                album: (al.id as unknown) as MediaLibrary.Album,
                first: 1,
                sortBy: [MediaLibrary.SortBy.creationTime],
                mediaType: MediaLibrary.MediaType.photo,
              });
              return res.assets[0]?.uri as string | undefined;
            } catch {
              return undefined;
            }
          })
        );
        const withThumbs: AlbumItem[] = list.map((al, idx) => ({ ...al, thumbUri: thumbs[idx] }));
        setAlbums(withThumbs);
      } catch {
        setAlbums([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => a.title.toLowerCase().includes(q));
  }, [albums, query]);

  const handleSelect = useCallback(
    (item: AlbumItem | null) => {
      if (haptic) Haptics.selectionAsync();
      onSelect(item ? item.id : null, item ? item.title : null);
      onClose();
    },
    [onSelect, onClose, haptic]
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <>
      <Animated.View
        style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('common.close')} />
      </Animated.View>
      <Animated.View
        style={[{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radii.xl,
          borderTopRightRadius: theme.radii.xl,
          paddingBottom: insets.bottom + 12,
        }, sheetStyle]}
      >
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ width: 36, height: 4, backgroundColor: theme.colors.line, borderRadius: 2 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary }}>
            {t('albumPicker.title')}
          </Text>
          <Pressable onPress={onClose} accessibilityLabel={t('common.close')}>
            <X size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <TextInput
            placeholder={t('albumPicker.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              color: theme.colors.textPrimary,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            accessibilityLabel={t('albumPicker.searchPlaceholder')}
          />
        </View>
        <Pressable onPress={() => handleSelect(null)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: selectedId ? 'transparent' : theme.colors.primaryMuted,
              borderRadius: 12,
              padding: 12,
            }}
            accessibilityLabel={t('albumPicker.allPhotos')}
          >
            <Text style={{ color: selectedId ? theme.colors.textPrimary : theme.colors.primary, fontWeight: '600' }}>
              {t('albumPicker.allPhotos')}
            </Text>
            {!selectedId && <Check size={18} color={theme.colors.primary} />}
          </View>
        </Pressable>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelect(item)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'transparent',
                  borderRadius: 16,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
                accessibilityLabel={`${item.title}`}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontWeight: '600',
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 2, fontSize: 12 }}>
                    {item.assetCount}
                  </Text>
                </View>
                {item.thumbUri ? (
                  <Image
                    source={{ uri: item.thumbUri }}
                    style={{ width: 56, height: 56, borderRadius: 12, marginLeft: 12 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      marginLeft: 12,
                      backgroundColor: theme.colors.surface,
                    }}
                  />
                )}
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ maxHeight: 360 }}
        />
      </Animated.View>
    </>
  );
}


