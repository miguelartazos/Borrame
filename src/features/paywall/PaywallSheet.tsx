import React from 'react';
import { PaywallSheet as PaywallSheetV2 } from './PaywallSheetV2';
import { PaywallErrorBoundary } from './PaywallErrorBoundary';

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  triggerPoint?: string;
  previewItems?: Array<{
    id: string;
    uri?: string;
    title?: string;
  }>;
  bundleKey?: string;
}

export const PaywallSheet: React.FC<PaywallSheetProps> = (props) => {
  return (
    <PaywallErrorBoundary>
      <PaywallSheetV2 {...props} />
    </PaywallErrorBoundary>
  );
};

export default PaywallSheet;
