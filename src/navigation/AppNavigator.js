import React, { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, useTheme, Portal, Dialog, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

// Import Screens
import AuthScreen from '../screens/AuthScreen';
import HouseholdSetupScreen from '../screens/HouseholdSetupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SummaryScreen from '../screens/SummaryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RateSettingsScreen from '../screens/RateSettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Stack for Dashboard & Sub-screens
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="RateSettings" component={RateSettingsScreen} />
    </Stack.Navigator>
  );
}

// Stack for Profile & Sub-screens
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="RateSettings" component={RateSettingsScreen} />
    </Stack.Navigator>
  );
}

// Main Bottom Tab Navigator
function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'DashboardTab') {
            iconName = 'view-dashboard';
          } else if (route.name === 'CalendarTab') {
            iconName = 'calendar';
          } else if (route.name === 'SummaryTab') {
            iconName = 'chart-box';
          } else if (route.name === 'ProfileTab') {
            iconName = 'account';
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="SummaryTab"
        component={SummaryScreen}
        options={{ tabBarLabel: 'Summary' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, profile, loading, updateInfo } = useApp();
  const theme = useTheme();
  const [dismissUpdate, setDismissUpdate] = useState(false);

  const showUpdateDialog = updateInfo?.updateAvailable && !dismissUpdate;

  // Show loading indicator during auth setup
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            // Logged in
            !profile?.household_id ? (
              // No household yet
              <Stack.Screen name="HouseholdSetup" component={HouseholdSetupScreen} />
            ) : (
              // Has household
              <Stack.Screen name="Main" component={TabNavigator} />
            )
          ) : (
            // Logged out
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* APK Update Dialog */}
      <Portal>
        <Dialog
          visible={showUpdateDialog}
          dismissable={!updateInfo?.forceUpdate}
          onDismiss={() => {
            if (!updateInfo?.forceUpdate) {
              setDismissUpdate(true);
            }
          }}
        >
          <Dialog.Title>Update Available</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12 }}>
              A new version ({updateInfo?.versionName}) of Daily Tracker is available. 
              Please download and install the new update.
            </Text>
            {updateInfo?.changelog ? (
              <Text style={{ fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
                Changelog: {updateInfo.changelog}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            {!updateInfo?.forceUpdate && (
              <Button onPress={() => setDismissUpdate(true)}>Later</Button>
            )}
            <Button
              mode="contained"
              onPress={() => {
                if (updateInfo?.apkUrl) {
                  Linking.openURL(updateInfo.apkUrl);
                }
              }}
            >
              Update Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
