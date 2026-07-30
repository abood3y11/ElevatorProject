#!/bin/bash
# ELMS Mobile Worker App Build Script

echo "================================"
echo "  Building ELMS Mobile App"
echo "================================"

cd mobile-worker

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build for Android (APK for testing)
echo ""
echo "Building Android APK..."
echo "Running: eas build --platform android --profile preview"
eas build --platform android --profile preview

# Optional: Build for iOS
# echo ""
# echo "Building iOS..."
# echo "Running: eas build --platform ios --profile preview"
# eas build --platform ios --profile preview

cd ..

echo ""
echo "================================"
echo "  Build Complete!"
echo "================================"
echo ""
echo "Download the APK from the EAS build page."

