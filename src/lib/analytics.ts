type EventName =
  | 'deck_opened'
  | 'swipe_decide'
  | 'undo'
  | 'filter_changed'
  | 'pending_opened'
  | 'pending_item_restored'
  | 'pending_all_restored'
  | 'commit_preview_shown'
  | 'commit_confirmed'
  | 'commit_canceled'
  | 'commit_completed'
  | 'commit_error'
  | 'limits_cap_hit'
  | 'paywall_viewed'
  | 'paywall_cta_click'
  | 'paywall_unlocked'
  | 'invite_pressed'
  | 'set_goal_pressed'
  | 'photo_group_pressed'
  | 'grid_asset_pressed'
  | 'filter_pressed'
  | 'library_bucket_pressed'
  | 'library_long_press'
  | 'library_filter_duplicates'
  | 'library_filter_videos'
  | 'library_sort_oldest'
  | 'library_filter_pressed'
  | 'album_picker_opened'
  | 'album_selected'
  | 'album_cleared'
  | 'swipe_tutorial_dismissed'
  | 'commit_blocked_permissions'
  | 'referrals_code_created'
  | 'referrals_share_pressed'
  | 'referrals_code_copied'
  | 'referrals_redeem_failed'
  | 'referrals_code_redeemed';

interface EventParams {
  deck_opened: { filter: string };
  swipe_decide: { action: 'delete' | 'keep'; duration?: number };
  undo: undefined;
  filter_changed: { newFilter: string };
  pending_opened: undefined;
  pending_item_restored: undefined;
  pending_all_restored: undefined;
  commit_preview_shown: {
    pendingCount: number;
    eligibleToCommit: number;
    willDefer: number;
    bytesEstimate: number;
    isPro: boolean;
  };
  commit_confirmed: {
    successCount: number;
    failureCount: number;
    bytesFreed: number;
  };
  commit_canceled: undefined;
  commit_completed: {
    successCount: number;
    failureCount: number;
    totalBytes: number;
    permissionError?: boolean;
  };
  commit_error: { error: string };
  commit_blocked_permissions: {
    isLimited: boolean;
    needsUpgrade: boolean;
  };
  limits_cap_hit: undefined;
  paywall_viewed: { trigger: string; bundle?: string; action?: string };
  paywall_cta_click: { trigger?: string; bundle?: string };
  paywall_unlocked: undefined;
  invite_pressed: undefined;
  set_goal_pressed: undefined;
  photo_group_pressed: { date: string };
  grid_asset_pressed: { id: string };
  filter_pressed: undefined;
  library_bucket_pressed: { monthKey: string; count: number };
  library_long_press: { monthKey: string };
  library_filter_duplicates: { monthKey: string };
  library_filter_videos: { monthKey: string };
  library_sort_oldest: { monthKey: string };
  library_filter_pressed: undefined;
  album_picker_opened: undefined;
  album_selected: { albumId: string; title?: string };
  album_cleared: undefined;
  swipe_tutorial_dismissed: { direction?: 'left' | 'right' };
  referrals_code_created: undefined;
  referrals_share_pressed: undefined;
  referrals_code_copied: undefined;
  referrals_redeem_failed: { error: string };
  referrals_code_redeemed: { code: string };
}

class Analytics {
  private optedIn = false;

  setOptIn(value: boolean) {
    this.optedIn = value;
  }

  track<T extends EventName>(event: T, params?: EventParams[T]) {
    if (!this.optedIn) return;
    // In production, no-op by default until a backend is integrated
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Analytics]', event, params);
    }
  }
}

export const analytics = new Analytics();
