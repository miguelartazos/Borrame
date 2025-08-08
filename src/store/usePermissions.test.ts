import { renderHook, act } from '@testing-library/react-hooks';
import * as MediaLibrary from 'expo-media-library';
import { usePermissions } from './usePermissions';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePermissions.setState({ status: 'undetermined' });
  });

  describe('refreshStatus', () => {
    it('should set status to granted when permissions are granted', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted',
      });

      const { result } = renderHook(() => usePermissions());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).toBe('granted');
    });

    it('should set status to limited when permissions are limited', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'limited',
      });

      const { result } = renderHook(() => usePermissions());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).toBe('limited');
    });

    it('should set status to undetermined when permissions are undetermined', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'undetermined',
      });

      const { result } = renderHook(() => usePermissions());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).toBe('undetermined');
    });
  });

  describe('requestAccess', () => {
    it('should request permissions with full access privileges', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted',
      });

      const { result } = renderHook(() => usePermissions());

      await act(async () => {
        await result.current.requestAccess();
      });

      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith({
        accessPrivileges: 'all',
      });
    });

    it('should return and set granted status when user grants permission', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted',
      });

      const { result } = renderHook(() => usePermissions());

      let returnedStatus: string;
      await act(async () => {
        returnedStatus = await result.current.requestAccess();
      });

      expect(result.current.status).toBe('granted');
      expect(returnedStatus!).toBe('granted');
    });

    it('should return and set limited status when user grants limited permission', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'limited',
      });

      const { result } = renderHook(() => usePermissions());

      let returnedStatus: string;
      await act(async () => {
        returnedStatus = await result.current.requestAccess();
      });

      expect(result.current.status).toBe('limited');
      expect(returnedStatus!).toBe('limited');
    });
  });

  describe('setStatus', () => {
    it('should update the status', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        result.current.setStatus('granted');
      });

      expect(result.current.status).toBe('granted');
    });
  });
});
