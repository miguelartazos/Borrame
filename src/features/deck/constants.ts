export const SWIPE_THRESHOLDS = {
  TRANSLATE_X: 100,
  VELOCITY_X: 800,
  MAX_ROTATION: 12,
  OPACITY_THRESHOLD: 0.5,
  SCALE_MIN: 0.98,
} as const;

export const DECK_CONFIG = {
  INITIAL_BATCH_SIZE: 60,
  BATCH_SIZE: 30,
  VISIBLE_CARDS: 5,
  PRELOAD_THRESHOLD: 15,
  UNDO_BUFFER_SIZE: 100,
  ANIMATION_DURATION: 250,
} as const;

export const SPRING_CONFIG = {
  SWIPE_BACK: {
    damping: 18,
    stiffness: 280,
    mass: 0.8,
  },
  CARD_ENTER: {
    damping: 15,
    stiffness: 200,
  },
  BUTTON_SCALE: {
    damping: 12,
    stiffness: 350,
  },
} as const;

export const HAPTIC_PATTERNS = {
  SWIPE_DECISION: 'impactLight',
  UNDO: 'impactMedium',
  ERROR: 'notificationError',
} as const;
