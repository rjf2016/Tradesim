import { Platform } from 'react-native';

/**
 * API Configuration
 *
 * Automatically selects the correct API URL based on platform:
 * - Web: Uses localhost (same machine as browser)
 * - iOS/Android: Uses your machine's local IP address
 *
 * Update EXPO_PUBLIC_LOCAL_API_IP (in `.env.local`) to match your development machine's IP address.
 */

// If running on native, this should be the local IP of your development machine
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_API_IP || '';

// Port the API runs on
const API_PORT = 3000;

function getApiUrl(): string {
  // Check for explicit override first (useful for production builds)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // In development, automatically select based on platform
  if (__DEV__) {
    if (Platform.OS === 'web') {
      // Web runs in browser on the same machine as the API
      return `http://localhost:${API_PORT}`;
    } else {
      // Native devices need the machine's actual IP
      return `http://${LOCAL_IP}:${API_PORT}`;
    }
  }

  // Production: should be set via environment variable
  // Fall back to localhost if not set (will fail on devices, but that's expected)
  return `http://localhost:${API_PORT}`;
}

export const API_URL = getApiUrl();

// Log the API URL in development for debugging
if (__DEV__) {
  console.log(`[API Config] Platform: ${Platform.OS}, URL: ${API_URL}`);
}
