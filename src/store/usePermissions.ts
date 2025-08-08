import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

type PermissionStatus = 'undetermined' | 'limited' | 'granted';

interface PermissionsStore {
  status: PermissionStatus;
  refreshStatus: () => Promise<void>;
  requestAccess: () => Promise<PermissionStatus>;
  setStatus: (status: PermissionStatus) => void;
}

export const usePermissions = create<PermissionsStore>()(
  persist(
    (set) => ({
      status: 'undetermined',

      refreshStatus: async () => {
        const result = await MediaLibrary.getPermissionsAsync();
        let status: PermissionStatus = 'undetermined';

        if (result.granted) {
          status = 'granted';
        } else if ((result as any).status === 'limited') {
          status = 'limited';
        } else if (result.status === 'undetermined') {
          status = 'undetermined';
        }

        set({ status });
      },

      requestAccess: async () => {
        const result = await MediaLibrary.requestPermissionsAsync({
          accessPrivileges: 'all',
        } as any);

        let status: PermissionStatus = 'undetermined';

        if (result.granted) {
          status = 'granted';
        } else if ((result as any).status === 'limited') {
          status = 'limited';
        } else if (result.status === 'undetermined') {
          status = 'undetermined';
        }

        set({ status });
        return status;
      },

      setStatus: (status) => set({ status }),
    }),
    {
      name: 'permissions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
