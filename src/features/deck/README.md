# Deck Feature

The swipe deck is the core interaction for reviewing and categorizing photos in SwipeClean.

## Architecture

### Data Flow

```
UI Components → Hooks → DB Helpers → SQLite
     ↑            ↓
     └── Stores ←─┘
```

### Key Components

#### UI Components

- **Deck.tsx** - Main gesture controller and card stack renderer
- **PhotoCard.tsx** - Individual card with image, overlays, and metadata
- **FilterTabs.tsx** - Filter selection (All/Screenshots/Recent)
- **DeckHeader.tsx** - Indexing progress and error states
- **EmptyState.tsx** - Shown when no photos to review

#### Hooks

- **useDeckDecisions** - Encapsulates decision logic and DB operations
- **useImagePrefetch** - Manages image prefetching queue

#### Database

- **addIntent(assetId, action)** - Records user decision
- **removeIntent(assetId)** - Removes decision (for undo)
- **getUndecidedAssets(filter, limit, offset)** - Fetches review queue

### Gesture Thresholds

Configured in `constants.ts`:

- **Translate X**: 120px - Minimum horizontal swipe distance
- **Velocity X**: 1000px/s - Minimum swipe velocity for quick decisions
- **Max Rotation**: 15° - Card rotation at swipe edge

### Image Prefetching

The deck prefetches the next 3-4 images to ensure smooth transitions:

- Max 6 concurrent prefetch operations
- Cancels prefetch for cards leaving the window
- Uses thumbnail URIs only (no full resolution)

## Testing

### Unit Tests

```bash
npm test src/db/helpers.test.ts  # DB operations
npm test src/components/PhotoCard.test.tsx  # Formatting
npm test src/store/useHistory.test.ts  # Undo buffer
```

### E2E Tests

```bash
npx detox test e2e/deck.test.ts
```

Tests cover:

- Basic swipe flow
- Undo functionality
- Filter switching
- Error recovery
- Performance (60fps target)

## Performance

### Optimizations

- Memoized components (FilterTabs, PhotoCard, etc.)
- Worklet-based animations (no JS thread blocking)
- Thumbnail-only rendering
- Coalesced database updates
- Smart prefetching

### Monitoring

- Target: 60fps on iPhone 11+
- Use React DevTools Profiler to identify re-renders
- Monitor prefetch queue size in development

## Settings

User preferences from `useSettings`:

- `swipeLeftAction`: 'delete' | 'keep' (default: 'delete')
- `swipeRightAction`: 'delete' | 'keep' (default: 'keep')
- `hapticFeedback`: boolean (default: true)

## Error Handling

- **ErrorBoundary** wraps deck content
- DB errors logged via `logger` utility
- Failed operations show retry UI
- Graceful degradation for missing permissions

## Accessibility

- VoiceOver labels on all interactive elements
- Tap buttons provided as swipe alternatives
- High contrast overlays for action indicators
- Respects system locale for dates/numbers

## Future Improvements

- [ ] Batch intent operations for better performance
- [ ] Add swipe sensitivity settings
- [ ] Implement smart filters (blurry, duplicates)
- [ ] Add tutorial/onboarding for first-time users
- [ ] Support for landscape orientation
