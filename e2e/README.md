# E2E Tests with Detox

## Prerequisites

1. iOS development environment set up (Xcode, iOS Simulator)
2. Detox CLI installed globally (optional): `npm install -g detox-cli`

## Running Tests

### iOS Simulator

1. Build the app for testing:
   ```bash
   npm run e2e:build:ios
   ```

2. Run the tests:
   ```bash
   npm run e2e:test:ios
   ```

### Release Configuration

For testing the release build:

1. Build:
   ```bash
   npm run e2e:build:ios:release
   ```

2. Test:
   ```bash
   npm run e2e:test:ios:release
   ```

## Test Structure

- `app.launch.test.js` - Tests app launch and permission flows
- `deck.flow.test.js` - Tests the main deck functionality (swipe, undo, filter)

## Critical Flows Covered (per CLAUDE.md T-2)

1. **Onboarding**: App launch with permission request
2. **Grant Access**: Permission handling (granted/limited/denied)
3. **Swipe**: Photo review gestures (keep/delete)
4. **Undo**: Undo last decision
5. **Filter**: Switch between photo filters

## Troubleshooting

- If tests fail to start, ensure iOS Simulator is available
- Clear Metro cache: `npx expo start -c`
- Clean Detox cache: `npm run e2e:clean`
- Rebuild native code after dependency changes: `cd ios && pod install`

## Adding TestIDs

When adding new components that need E2E testing:

1. Add `testID` prop to the component
2. Use descriptive, camelCase IDs (e.g., `testID="filterTab_all"`)
3. Document the testID in the component for future reference