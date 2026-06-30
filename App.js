import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { lightTheme } from './src/theme/theme';

export default function App() {
  useEffect(() => {
    async function checkOTAUps() {
      if (__DEV__) return; // Skip in development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // Reload the app with the new bundle
        }
      } catch (error) {
        console.log('Error checking for OTA updates:', error);
      }
    }
    checkOTAUps();
  }, []);

  return (
    <PaperProvider theme={lightTheme}>
      <AppProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AppProvider>
    </PaperProvider>
  );
}
