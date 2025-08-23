import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, TextInput } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';
import { theme } from '../../ui';

interface AlbumRow {
  id: string;
  title: string;
  assetCount: number;
  thumbUri?: string;
}

interface AlbumListProps {
  selectedId: string | null;
  onSelect: (id: string | null, title?: string | null) => void;
}

export function AlbumList({ selectedId, onSelect }: AlbumListProps) {
  const { t } = useTranslation();
  const haptic = useSettings((s) => s.hapticFeedback);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [query, setQuery] = useState('');

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
        const thumbs = await Promise.all(
          list.slice(0, 100).map(async (al) => {
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
        const withThumbs: AlbumRow[] = list.map((al, i) => ({ ...al, thumbUri: thumbs[i] }));
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('albumPicker.title')}</Text>
      <TextInput
        placeholder={t('albumPicker.searchPlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        accessibilityLabel={t('albumPicker.searchPlaceholder')}
      />

      <Pressable
        onPress={() => {
          if (haptic) Haptics.selectionAsync();
          onSelect(null, null);
        }}
        style={styles.allRow}
        accessibilityLabel={t('albumPicker.allPhotos')}
      >
        <Text style={styles.allText}>{t('albumPicker.allPhotos')}</Text>
      </Pressable>

      <View style={{ paddingBottom: 12 }}>
        {filtered.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (haptic) Haptics.selectionAsync();
              onSelect(item.id, item.title);
            }}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.count}>{item.assetCount}</Text>
            </View>
            {item.thumbUri ? (
              <Image source={{ uri: item.thumbUri }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: theme.colors.surface }]} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  header: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  search: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  allRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryMuted,
    marginBottom: 6,
  },
  allText: { color: theme.colors.primary, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  title: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: 16 },
  count: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  thumb: { width: 56, height: 56, borderRadius: 12, marginLeft: 12 },
});


