import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { usePermissions } from '../src/store/usePermissions';
import { RequestPhotos } from '../src/components/RequestPhotos';
import { LandingScreen } from '../src/components/LandingScreen';
import '../src/i18n';

export default function Welcome() {
  const router = useRouter();
  const status = usePermissions((s) => s.status);
  const refreshStatus = usePermissions((s) => s.refreshStatus);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status === 'granted') {
      router.replace('/(main)/deck');
    }
  }, [status, router]);

  if (showLanding) {
    return <LandingScreen onContinue={() => setShowLanding(false)} />;
  }

  if (status !== 'granted') {
    return <RequestPhotos />;
  }

  return null;
}
