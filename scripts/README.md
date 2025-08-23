# Simulator Launch Scripts

## Configuration
- **SwipeClean App**: Runs on Metro port 8802 on iPhone 16 simulator
- **Guinote App**: Runs on Metro port 8803 on iPhone 16 Pro simulator

## Available Scripts

### Run SwipeClean on iPhone 16
```bash
npm run ios:16
```
This will:
- Kill any existing Metro on port 8802
- Boot iPhone 16 simulator
- Start Metro bundler on port 8802
- Build and deploy SwipeClean to iPhone 16

### Run Just Metro for iPhone 16
```bash
npm run ios:16:metro
```
Starts Metro bundler on port 8802 without building

### Build and Deploy to iPhone 16 (Metro must be running)
```bash
npm run ios:16:run
```
Builds and deploys to iPhone 16 using Metro on port 8802

### Run Guinote on iPhone 16 Pro
```bash
npm run ios:16pro:guinote
```
**Note**: Update the GUINOTE_PATH in the script if your guinote app is in a different location

### Run Both Apps Simultaneously
```bash
npm run ios:both
```
Launches both SwipeClean (iPhone 16, port 8802) and Guinote (iPhone 16 Pro, port 8803)

## Device IDs
- iPhone 16: `783931F3-3F74-44AB-861A-359EEC5D008F`
- iPhone 16 Pro: `A7967296-39C9-49CC-A867-CD50BE45B113`

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error, kill the process:
```bash
lsof -ti:8802 | xargs kill -9  # For SwipeClean
lsof -ti:8803 | xargs kill -9  # For Guinote
```

### Simulator Not Found
If the simulator IDs change, update them in the scripts. Find current IDs:
```bash
xcrun simctl list devices | grep "iPhone 16"
```

### Metro Cache Issues
Clear Metro cache if you encounter bundling issues:
```bash
npx expo start -c
```