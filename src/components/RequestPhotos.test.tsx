import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { RequestPhotos } from './RequestPhotos';
import { usePermissions } from '../store/usePermissions';

jest.mock('../store/usePermissions');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('RequestPhotos', () => {
  const mockRequestAccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.MockedFunction<typeof usePermissions>).mockReturnValue({
      status: 'undetermined',
      requestAccess: mockRequestAccess,
      refreshStatus: jest.fn(),
      setStatus: jest.fn(),
    });
  });

  it('should render the permission request screen', () => {
    const { getByText } = render(<RequestPhotos />);

    expect(getByText('requestPhotos.title')).toBeTruthy();
    expect(getByText('requestPhotos.subtitle')).toBeTruthy();
    expect(getByText('requestPhotos.cta')).toBeTruthy();
  });

  it('should call requestAccess when Allow Access button is pressed', async () => {
    const { getByText } = render(<RequestPhotos />);

    const button = getByText('requestPhotos.cta');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockRequestAccess).toHaveBeenCalled();
    });
  });

  it('should show limited access banner when status is limited', () => {
    (usePermissions as jest.MockedFunction<typeof usePermissions>).mockReturnValue({
      status: 'limited',
      requestAccess: mockRequestAccess,
      refreshStatus: jest.fn(),
      setStatus: jest.fn(),
    });

    const { getByText } = render(<RequestPhotos />);

    expect(getByText('requestPhotos.limitedBanner')).toBeTruthy();
  });

  it('should open settings when limited access banner is pressed', () => {
    (usePermissions as jest.MockedFunction<typeof usePermissions>).mockReturnValue({
      status: 'limited',
      requestAccess: mockRequestAccess,
      refreshStatus: jest.fn(),
      setStatus: jest.fn(),
    });

    const { getByText } = render(<RequestPhotos />);

    const banner = getByText('requestPhotos.limitedBanner');
    fireEvent.press(banner);

    expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
  });

  it('should not show limited access banner when status is not limited', () => {
    const { queryByText } = render(<RequestPhotos />);

    expect(queryByText('requestPhotos.limitedBanner')).toBeNull();
  });
});
