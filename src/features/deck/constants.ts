export const SWIPE_THRESHOLDS = {
  TRANSLATE_X: 120,
  VELOCITY_X: 1000,
  MAX_ROTATION: 15,
  OPACITY_THRESHOLD: 0.4,
  SCALE_MIN: 0.95,
} as const;

export const DECK_CONFIG = {
  INITIAL_BATCH_SIZE: 60,
  BATCH_SIZE: 30,
  VISIBLE_CARDS: 5,
  PRELOAD_THRESHOLD: 15,
  UNDO_BUFFER_SIZE: 100,
  ANIMATION_DURATION: 300,
} as const;

export const HAPTIC_PATTERNS = {
  SWIPE_DECISION: 'impactLight',
  UNDO: 'impactMedium',
  ERROR: 'notificationError',
} as const;
