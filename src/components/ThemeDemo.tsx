/**
 * Theme Demo Component
 * Demonstrates usage of the design system tokens
 */

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { theme } from '../ui';

export const ThemeDemo = () => {
  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="p-lg">
        {/* Typography Demo */}
        <View className="mb-2xl">
          <Text className="text-display text-text-primary font-semibold mb-md">Display Text</Text>
          <Text className="text-title text-text-primary font-semibold mb-md">Title Text</Text>
          <Text className="text-body text-text-primary mb-md">Body Text</Text>
          <Text className="text-caption text-text-secondary">Caption Text</Text>
        </View>

        {/* Color Swatches */}
        <View className="mb-2xl">
          <Text className="text-title text-text-primary font-semibold mb-md">Colors</Text>
          <View className="flex-row flex-wrap">
            <ColorSwatch name="bg" color={theme.colors.bg} />
            <ColorSwatch name="card" color={theme.colors.card} />
            <ColorSwatch name="surface" color={theme.colors.surface} />
            <ColorSwatch name="primary" color={theme.colors.primary} />
            <ColorSwatch name="success" color={theme.colors.success} />
            <ColorSwatch name="danger" color={theme.colors.danger} />
          </View>
        </View>

        {/* Spacing Demo */}
        <View className="mb-2xl">
          <Text className="text-title text-text-primary font-semibold mb-md">Spacing</Text>
          <View className="bg-card rounded-md p-md">
            <View className="bg-surface rounded-sm p-sm mb-sm">
              <Text className="text-caption text-text-secondary">Small (8dp)</Text>
            </View>
            <View className="bg-surface rounded-sm p-md mb-sm">
              <Text className="text-caption text-text-secondary">Medium (12dp)</Text>
            </View>
            <View className="bg-surface rounded-sm p-lg">
              <Text className="text-caption text-text-secondary">Large (16dp)</Text>
            </View>
          </View>
        </View>

        {/* Border Radius Demo */}
        <View className="mb-2xl">
          <Text className="text-title text-text-primary font-semibold mb-md">Border Radius</Text>
          <View className="flex-row justify-between">
            <View className="bg-primary rounded-sm w-16 h-16 items-center justify-center">
              <Text className="text-white text-caption">sm</Text>
            </View>
            <View className="bg-primary rounded-md w-16 h-16 items-center justify-center">
              <Text className="text-white text-caption">md</Text>
            </View>
            <View className="bg-primary rounded-lg w-16 h-16 items-center justify-center">
              <Text className="text-white text-caption">lg</Text>
            </View>
            <View className="bg-primary rounded-xl w-16 h-16 items-center justify-center">
              <Text className="text-white text-caption">xl</Text>
            </View>
          </View>
        </View>

        {/* Shadow Demo */}
        <View className="mb-2xl">
          <Text className="text-title text-text-primary font-semibold mb-md">
            Shadows (StyleSheet)
          </Text>
          <Pressable style={theme.card.base} className="p-lg mb-md">
            <Text className="text-body text-text-primary">Card Shadow</Text>
          </Pressable>
          <Pressable style={theme.card.floating} className="p-lg">
            <Text className="text-body text-text-primary">Floating Shadow</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const ColorSwatch = ({ name, color }: { name: string; color: string }) => (
  <View className="mr-sm mb-sm">
    <View className="w-16 h-16 rounded-md mb-xs" style={{ backgroundColor: color }} />
    <Text className="text-caption text-text-secondary text-center">{name}</Text>
  </View>
);

export default ThemeDemo;
