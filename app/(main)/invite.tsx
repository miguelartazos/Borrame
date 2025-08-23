import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { InviteScreen } from '../../src/features/referrals/InviteScreen';

export default function InviteRoute() {
  return (
    <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <InviteScreen />
    </SafeAreaView>
  );
}


