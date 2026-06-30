import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function HouseholdSetupScreen() {
  const { profile, createHousehold, joinHousehold, signOut } = useApp();
  const theme = useTheme();

  const [hName, setHName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  const handleCreate = async () => {
    if (!hName.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for your household.');
      return;
    }
    setLoadingCreate(true);
    const { error } = await createHousehold(hName.trim());
    setLoadingCreate(false);
    if (error) {
      Alert.alert('Creation Failed', error.message);
    } else {
      Alert.alert('Success', `Household "${hName}" created!`);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid 6-character invite code.');
      return;
    }
    setLoadingJoin(true);
    const { error } = await joinHousehold(inviteCode.trim());
    setLoadingJoin(false);
    if (error) {
      Alert.alert('Join Failed', error.message);
    } else {
      Alert.alert('Success', 'Successfully joined the household!');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
            Hello, {profile?.name || 'User'}!
          </Text>
          <Text style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}>
            To start logging milk and water cans, you need to set up a household. You can create a new one or join an existing one.
          </Text>
        </View>

        {/* Create Household Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.cardTitle}>Create a Household</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Create a new household. You'll get an invite code to share with your partner.
            </Text>
            <TextInput
              label="Household Name"
              value={hName}
              onChangeText={setHName}
              mode="outlined"
              placeholder="e.g. Home, Apartment 4B"
              style={styles.input}
              disabled={loadingCreate || loadingJoin}
            />
            {loadingCreate ? (
              <ActivityIndicator animating={true} color={theme.colors.primary} style={styles.spinner} />
            ) : (
              <Button
                mode="contained"
                onPress={handleCreate}
                disabled={loadingJoin}
                icon="home-plus"
                style={styles.button}
              >
                Create
              </Button>
            )}
          </Card.Content>
        </Card>

        <View style={styles.dividerContainer}>
          <Divider style={styles.divider} />
          <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>OR</Text>
          <Divider style={styles.divider} />
        </View>

        {/* Join Household Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.cardTitle}>Join a Household</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Enter the invite code shared by your partner to link accounts and share data.
            </Text>
            <TextInput
              label="Invite Code"
              value={inviteCode}
              onChangeText={setInviteCode}
              mode="outlined"
              placeholder="e.g. A1B2C3"
              autoCapitalize="characters"
              maxLength={6}
              style={styles.input}
              disabled={loadingCreate || loadingJoin}
            />
            {loadingJoin ? (
              <ActivityIndicator animating={true} color={theme.colors.primary} style={styles.spinner} />
            ) : (
              <Button
                mode="contained"
                onPress={handleJoin}
                disabled={loadingCreate}
                icon="account-multiple-plus"
                style={[styles.button, { backgroundColor: theme.colors.secondary }]}
              >
                Join Household
              </Button>
            )}
          </Card.Content>
        </Card>

        <Button mode="outlined" onPress={signOut} style={styles.signOutButton} icon="logout">
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontWeight: '600',
    fontSize: 14,
  },
  signOutButton: {
    marginTop: 24,
    borderRadius: 8,
  },
  spinner: {
    marginVertical: 12,
  },
});
