# Photo Indexer Module

## Overview

The indexer module provides progressive photo indexing with support for pause/resume, background handling, and limited access modes. It ensures only one indexing run occurs at a time and properly handles app lifecycle events.

## Architecture

### Core Components

- **`indexer.ts`** - Main indexing logic with cancellable/pausable control flow
- **`LimitedAccessBanner.tsx`** - UI component for limited photo access warning
- **Store fields** (`useIndexStore`) - Tracks indexing state and progress

### Key Features

1. **Single-run guarantee** - Only one indexer can run at a time
2. **Pause/Resume** - Automatic pause on background, resume on foreground
3. **Limited access support** - Works with both full and limited photo permissions
4. **Race protection** - Prevents duplicate runs and data corruption
5. **Clean cancellation** - Proper cleanup of all resources on cancel

## Store Fields

The `useIndexStore` manages the following state:

- `running: boolean` - Is indexing currently active
- `paused: boolean` - Is indexing paused (e.g., app in background)
- `currentRunId?: string` - Unique ID of current indexing run
- `limitedScope: boolean` - True if user granted limited photo access
- `total: number` - Total number of photos to index
- `indexed: number` - Number of photos indexed so far
- `lastError?: string` - Last error message if indexing failed

## Control Flow

### Starting an Index Run

```typescript
const control = await runInitialIndex();
// Returns IndexControl with cancel/pause/resume methods
```

### Cancellation

```typescript
control.cancel(); // Stops indexing and cleans up
```

### Automatic Pause/Resume

- App goes to background → indexing pauses
- App returns to foreground → indexing resumes
- No manual intervention needed

## Permissions Handling

### Full Access (granted)

- Indexes entire photo library
- No UI warnings shown

### Limited Access

- Indexes only user-selected photos
- Shows `LimitedAccessBanner` with Settings deep-link
- Sets `limitedScope: true` in store

### No Access (undetermined)

- Indexing does not start
- User must grant permissions first

## Testing

### Unit Tests

- `detectScreenshot` - Screenshot detection logic
- `checkCanIndex` - Permission validation
- `mapAssetToDBSchema` - Asset transformation
- `processAssetBatch` - Batch insertion with rollback
- `runInitialIndex` - Full indexing flow with mocked MediaLibrary

### Integration Tests

- Cold start behavior
- Background/foreground transitions
- Race condition handling
- Progress tracking

## Error Handling

- **Development**: Errors logged to console
- **Production**: Errors stored in `lastError` field
- **No user toasts**: Silent failure with store tracking

## Performance Considerations

- Batch size: 200 photos per batch (configurable)
- UI yielding: Uses `InteractionManager.runAfterInteractions`
- Transaction batching: All DB inserts in single transaction
- Memory efficient: Processes one batch at a time

## Future Improvements

1. Add retry logic for transient failures
2. Support incremental updates (new photos since last index)
3. Add telemetry for indexing performance
4. Implement smart batch sizing based on device performance
5. Add user-visible error recovery options
