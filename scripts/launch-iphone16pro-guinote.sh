#!/bin/bash

# Launch script for iPhone 16 Pro simulator with guinote app
# This script assumes guinote app is in a sibling directory

# Kill any existing Metro bundler on port 8803 (different port for guinote)
lsof -ti:8803 | xargs kill -9 2>/dev/null

# Specific iPhone 16 Pro device ID (from xcrun simctl list)
IPHONE_16_PRO_ID="A7967296-39C9-49CC-A867-CD50BE45B113"

# Boot the simulator if not already booted
xcrun simctl boot $IPHONE_16_PRO_ID 2>/dev/null

# Open the simulator
open -a Simulator --args -CurrentDeviceUDID $IPHONE_16_PRO_ID

# Navigate to guinote app directory (adjust path as needed)
GUINOTE_PATH="/Users/maiky/borrame/guinote"

if [ ! -d "$GUINOTE_PATH" ]; then
  echo "Guinote app directory not found at $GUINOTE_PATH"
  echo "Please update the GUINOTE_PATH variable in this script"
  exit 1
fi

cd "$GUINOTE_PATH"

# Start Metro bundler on port 8803 for guinote
echo "Starting Metro bundler for guinote on port 8803..."
RCT_METRO_PORT=8803 npx expo start --port 8803 --ios &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Build and run on the specific iPhone 16 Pro simulator
echo "Building and running guinote on iPhone 16 Pro..."
RCT_METRO_PORT=8803 npx expo run:ios --device "$IPHONE_16_PRO_ID"

# Keep the script running
wait $METRO_PID