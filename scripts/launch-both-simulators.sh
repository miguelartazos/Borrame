#!/bin/bash

# Launch both apps on their respective simulators

echo "Launching SwipeClean on iPhone 16 and Guinote on iPhone 16 Pro..."

# Kill any existing Metro bundlers
lsof -ti:8802 | xargs kill -9 2>/dev/null
lsof -ti:8803 | xargs kill -9 2>/dev/null

# Device IDs
IPHONE_16_ID="783931F3-3F74-44AB-861A-359EEC5D008F"
IPHONE_16_PRO_ID="A7967296-39C9-49CC-A867-CD50BE45B113"

# Boot both simulators
echo "Booting simulators..."
xcrun simctl boot $IPHONE_16_ID 2>/dev/null
xcrun simctl boot $IPHONE_16_PRO_ID 2>/dev/null

# Open both simulators
open -a Simulator --args -CurrentDeviceUDID $IPHONE_16_ID
open -a Simulator --args -CurrentDeviceUDID $IPHONE_16_PRO_ID

# Launch SwipeClean on iPhone 16 (port 8802)
echo "Starting SwipeClean on iPhone 16 (port 8802)..."
cd /Users/maiky/borrame/swipeclean
RCT_METRO_PORT=8802 npx expo start --port 8802 &
SWIPECLEAN_PID=$!

# Wait a bit for first Metro to start
sleep 5

# Launch guinote on iPhone 16 Pro (port 8803) if directory exists
GUINOTE_PATH="/Users/maiky/borrame/guinote"
if [ -d "$GUINOTE_PATH" ]; then
  echo "Starting Guinote on iPhone 16 Pro (port 8803)..."
  cd "$GUINOTE_PATH"
  RCT_METRO_PORT=8803 npx expo start --port 8803 &
  GUINOTE_PID=$!
else
  echo "Guinote directory not found at $GUINOTE_PATH - skipping"
fi

# Build and run apps on specific simulators
sleep 5
echo "Building and deploying apps..."

cd /Users/maiky/borrame/swipeclean
RCT_METRO_PORT=8802 npx expo run:ios --device "$IPHONE_16_ID" &

if [ -d "$GUINOTE_PATH" ]; then
  cd "$GUINOTE_PATH"
  RCT_METRO_PORT=8803 npx expo run:ios --device "$IPHONE_16_PRO_ID" &
fi

echo "Both apps are launching. Press Ctrl+C to stop all processes."

# Keep the script running
wait