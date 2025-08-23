#!/bin/bash

# Launch script for iPhone 16 simulator with Metro on port 8802

# Kill any existing Metro bundler on port 8802
lsof -ti:8802 | xargs kill -9 2>/dev/null

# Specific iPhone 16 device ID (from xcrun simctl list)
IPHONE_16_ID="783931F3-3F74-44AB-861A-359EEC5D008F"

# Boot the simulator if not already booted
xcrun simctl boot $IPHONE_16_ID 2>/dev/null

# Open the simulator
open -a Simulator --args -CurrentDeviceUDID $IPHONE_16_ID

# Start Metro bundler on port 8802
echo "Starting Metro bundler on port 8802..."
RCT_METRO_PORT=8802 npx expo start --port 8802 --ios &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Build and run on the specific iPhone 16 simulator
echo "Building and running on iPhone 16..."
RCT_METRO_PORT=8802 npx expo run:ios --device "$IPHONE_16_ID"

# Keep the script running
wait $METRO_PID