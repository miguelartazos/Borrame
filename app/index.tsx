import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { usePermissions } from '../src/store/usePermissions';
import { RequestPhotos } from '../src/components/RequestPhotos';
import '../src/i18n';

export default function Welcome() {
  const router = useRouter();
  const { status, refreshStatus } = usePermissions();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status === 'granted') {
      router.replace('/(main)/deck');
    }
  }, [status, router]);

  if (status !== 'granted') {
    return <RequestPhotos />;
  }

  return null;
}
