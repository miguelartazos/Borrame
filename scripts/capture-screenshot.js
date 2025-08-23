#!/usr/bin/env node

/**
 * Screenshot capture script for SwipeClean app
 * Captures the home screen in dark mode with iPhone 15 frame
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SIMULATOR_NAME = 'iPhone 15';
const APP_BUNDLE_ID = 'com.swipeclean.app';
const OUTPUT_DIR = path.join(__dirname, '../design/exports');
const OUTPUT_FILE = 'Home_v1_dark.png';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function captureScreenshot() {
  console.log('📸 Capturing screenshot...');

  try {
    // 1. Boot simulator if not already running
    console.log(`Starting ${SIMULATOR_NAME} simulator...`);
    execSync(`xcrun simctl boot "${SIMULATOR_NAME}"`, { stdio: 'ignore' });

    // Wait for simulator to boot
    execSync('sleep 5');

    // 2. Set dark mode
    console.log('Setting dark mode...');
    execSync(`xcrun simctl ui "${SIMULATOR_NAME}" appearance dark`);

    // 3. Launch the app
    console.log('Launching SwipeClean app...');
    execSync(`xcrun simctl launch "${SIMULATOR_NAME}" ${APP_BUNDLE_ID}`);

    // Wait for app to load
    execSync('sleep 3');

    // 4. Navigate to home screen (if needed)
    // The app should start at the home screen by default

    // 5. Capture screenshot
    const tempFile = path.join(OUTPUT_DIR, 'temp_screenshot.png');
    console.log('Taking screenshot...');
    execSync(`xcrun simctl io "${SIMULATOR_NAME}" screenshot "${tempFile}"`);

    // 6. Add iPhone 15 frame (using imagemagick if available)
    // For now, we'll just rename the file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.renameSync(tempFile, outputPath);

    console.log(`✅ Screenshot saved to: ${outputPath}`);

    // 7. Optional: Add device frame using a tool like fastlane frameit
    // This would require additional setup

    return outputPath;
  } catch (error) {
    console.error('❌ Error capturing screenshot:', error.message);
    process.exit(1);
  }
}

// Alternative method using React Native's built-in screenshot capability
function captureScreenshotRN() {
  console.log('📸 Using React Native screenshot method...');

  const screenshotCode = `
import { captureScreen } from 'react-native-view-shot';

export async function takeScreenshot() {
  try {
    const uri = await captureScreen({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    
    // Move to desired location
    const destPath = '${path.join(OUTPUT_DIR, OUTPUT_FILE)}';
    // File operations would go here
    
    return uri;
  } catch (error) {
    console.error('Screenshot failed:', error);
  }
}
`;

  // Save this as a utility that can be called from the app
  const utilPath = path.join(__dirname, '../src/utils/screenshot.ts');
  fs.writeFileSync(utilPath, screenshotCode);

  console.log('Screenshot utility created at:', utilPath);
}

// Main execution
if (require.main === module) {
  console.log('🚀 SwipeClean Screenshot Tool');
  console.log('================================');

  // Check if running on macOS
  if (process.platform !== 'darwin') {
    console.error('❌ This script requires macOS with Xcode installed');
    process.exit(1);
  }

  // Try simulator method first
  captureScreenshot();

  // Also create the RN utility for in-app screenshots
  captureScreenshotRN();
}

module.exports = { captureScreenshot };
