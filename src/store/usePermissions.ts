import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { logger } from '../lib/logger';

type PermissionStatus = 'undetermined' | 'limited' | 'granted';

type PermissionResponseWithAccess = MediaLibrary.PermissionResponse & {
  accessPrivileges?: 'all' | 'limited' | 'none';
};

interface PermissionsStore {
  status: PermissionStatus;
  debugOverride?: PermissionStatus;
  refreshStatus: () => Promise<void>;
  requestAccess: () => Promise<PermissionStatus>;
  setStatus: (status: PermissionStatus) => void;
  setDebugOverride: (status: PermissionStatus | undefined) => void;
  getStatus: () => PermissionStatus;
}

function getPermissionStatus(result: MediaLibrary.PermissionResponse): PermissionStatus {
  const resultWithAccess = result as PermissionResponseWithAccess;

  if (result.granted && resultWithAccess.accessPrivileges === 'all') {
    return 'granted';
  } else if (resultWithAccess.accessPrivileges === 'limited') {
    return 'limited';
  } else if (result.status === 'undetermined') {
    return 'undetermined';
  }
  return 'undetermined';
}

export const usePermissions = create<PermissionsStore>()(
  persist(
    (set, get) => ({
      status: 'undetermined',
      debugOverride: undefined,

      refreshStatus: async () => {
        try {
          const result = await MediaLibrary.getPermissionsAsync();
          const status = getPermissionStatus(result);
          set({ status });
        } catch (error) {
          logger.error('Error checking permissions:', error as Error);
        }
      },

      requestAccess: async () => {
        try {
          const result = await MediaLibrary.requestPermissionsAsync();
          const status = getPermissionStatus(result);
          set({ status });
          return status;
        } catch (error) {
          logger.error('Error requesting permissions:', error as Error);
          return 'undetermined';
        }
      },

      setStatus: (status) => set({ status }),

      setDebugOverride: (status) => set({ debugOverride: status }),

      getStatus: () => {
        const state = get();
        return state.debugOverride ?? state.status;
      },
    }),
    {
      name: 'permissions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
