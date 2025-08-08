type EventName = 'deck_opened' | 'swipe_decide' | 'undo' | 'filter_changed';

interface EventParams {
  deck_opened: { filter: string };
  swipe_decide: { action: 'delete' | 'keep'; duration?: number };
  undo: undefined;
  filter_changed: { newFilter: string };
}

class Analytics {
  private optedIn = false;

  setOptIn(value: boolean) {
    this.optedIn = value;
  }

  track<T extends EventName>(event: T, params?: EventParams[T]) {
    if (!this.optedIn) return;

    console.log('[Analytics]', event, params);
  }
}

export const analytics = new Analytics();
