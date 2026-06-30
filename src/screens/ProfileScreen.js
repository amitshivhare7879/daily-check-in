import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Share } from 'react-native';
import { Text, Card, TextInput, Button, IconButton, Divider, useTheme, List, Avatar } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function ProfileScreen({ navigation }) {
  const {
    user,
    profile,
    household,
    householdMembers,
    updateProfileName,
    leaveHousehold,
    signOut,
    updateBillingCycle,
  } = useApp();
  const theme = useTheme();

  const [name, setName] = useState(profile?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [billingStartDay, setBillingStartDay] = useState(household?.billing_start_day?.toString() || '1');
  const [savingCycle, setSavingCycle] = useState(false);

  useEffect(() => {
    if (household?.billing_start_day) {
      setBillingStartDay(household.billing_start_day.toString());
    }
  }, [household?.billing_start_day]);

  const handleSaveBillingCycle = async () => {
    const day = parseInt(billingStartDay, 10);
    if (isNaN(day) || day < 1 || day > 28) {
      Alert.alert('Validation Error', 'Billing start day must be a number between 1 and 28.');
      return;
    }
    setSavingCycle(true);
    const { success, error } = await updateBillingCycle(day);
    setSavingCycle(false);
    if (success) {
      Alert.alert('Success', `Billing cycle start day updated to day ${day} of the month.`);
    } else {
      Alert.alert('Update Failed', error.message);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be blank.');
      return;
    }
    setSavingName(true);
    const { success, error } = await updateProfileName(name.trim());
    setSavingName(false);
    if (success) {
      setIsEditingName(false);
    } else {
      Alert.alert('Update Failed', error.message);
    }
  };

  const handleShareInvite = async () => {
    if (!household?.invite_code) return;
    try {
      await Share.share({
        message: `Join my household "${household.name}" on Daily Tracker!\nUse this invite code to link accounts:\n👉 ${household.invite_code} 👈`,
        title: 'Daily Tracker Invite',
      });
    } catch (error) {
      console.error('Sharing failed:', error.message);
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Leave Household',
      `Are you sure you want to leave "${household?.name}"? You will no longer share entries and rates with your partner.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveHousehold();
          },
        },
      ]
    );
  };

  const getInitials = (userName) => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.contentContainer}>
        {/* User Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.userCardContent}>
            <Avatar.Text
              size={64}
              label={getInitials(profile?.name)}
              style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
              labelStyle={{ color: theme.colors.primary, fontWeight: '700' }}
            />
            
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  label="Display Name"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.nameInput}
                  dense
                  disabled={savingName}
                />
                <IconButton
                  icon="check-circle"
                  iconColor={theme.colors.secondary}
                  size={28}
                  onPress={handleSaveName}
                  disabled={savingName}
                />
                <IconButton
                  icon="close-circle-outline"
                  iconColor={theme.colors.error}
                  size={28}
                  onPress={() => {
                    setName(profile?.name || '');
                    setIsEditingName(false);
                  }}
                  disabled={savingName}
                />
              </View>
            ) : (
              <View style={styles.displayNameRow}>
                <Text style={styles.userName}>{profile?.name || 'User Name'}</Text>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => setIsEditingName(true)}
                />
              </View>
            )}

            <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
              {profile?.email || user?.email}
            </Text>
          </Card.Content>
        </Card>

        {/* Household Invite Card */}
        {household ? (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionHeader}>Household Settings</Text>
              
              <View style={styles.householdInfoRow}>
                <View>
                  <Text style={styles.householdLabel}>Household Name</Text>
                  <Text style={styles.householdVal}>{household.name}</Text>
                </View>
              </View>

              <Button
                mode="outlined"
                icon="cash-cog"
                onPress={() => navigation.navigate('RateSettings')}
                style={{ marginTop: 12, borderRadius: 8 }}
              >
                Manage Unit Rates
              </Button>

              <Divider style={styles.divider} />

              <View style={styles.inviteContainer}>
                <View style={styles.inviteLeft}>
                  <Text style={styles.householdLabel}>Partner Invite Code</Text>
                  <Text style={[styles.inviteCode, { color: theme.colors.primary }]}>
                    {household.invite_code}
                  </Text>
                </View>
                <Button
                  mode="contained"
                  onPress={handleShareInvite}
                  icon="share-variant"
                  style={styles.shareButton}
                >
                  Share Code
                </Button>
              </View>

              <Text style={[styles.inviteHint, { color: theme.colors.onSurfaceVariant }]}>
                Share this code with your partner. When they join, they'll immediately see your logs, rates, and updates.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Billing Cycle Card */}
        {household ? (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionHeader}>Billing Cycle Settings</Text>
              <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant, marginBottom: 12 }]}>
                Set the day of the month your monthly billing cycle starts. For example, if you pay on the 5th, set it to 5.
              </Text>
              <View style={styles.cycleRow}>
                <TextInput
                  label="Start Day (1-28)"
                  value={billingStartDay}
                  onChangeText={(text) => setBillingStartDay(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={2}
                  mode="outlined"
                  style={styles.cycleInput}
                  dense
                  disabled={savingCycle}
                />
                <Button
                  mode="contained"
                  onPress={handleSaveBillingCycle}
                  loading={savingCycle}
                  disabled={savingCycle}
                  style={styles.cycleSaveBtn}
                >
                  Update
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {/* Household Members List */}
        {household && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.sectionHeader}>
                Household Members ({householdMembers.length})
              </Text>
              
              <List.Section style={styles.memberList}>
                {householdMembers.map((member) => (
                  <List.Item
                    key={member.id}
                    title={member.name}
                    description={member.email}
                    titleStyle={{ fontWeight: '600' }}
                    left={(props) => (
                      <Avatar.Text
                        {...props}
                        size={36}
                        label={getInitials(member.name)}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                        labelStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 13, fontWeight: '700' }}
                      />
                    )}
                    right={(props) =>
                      member.id === user?.id ? (
                        <Text {...props} style={[styles.youTag, { color: theme.colors.secondary }]}>
                          You
                        </Text>
                      ) : null
                    }
                  />
                ))}
              </List.Section>
            </Card.Content>
          </Card>
        )}

        {/* Dangerous Actions Area */}
        <View style={styles.actionsArea}>
          {household && (
            <Button
              mode="outlined"
              onPress={handleLeaveHousehold}
              textColor={theme.colors.error}
              style={[styles.actionBtn, { borderColor: theme.colors.error }]}
              icon="home-remove"
            >
              Leave Household
            </Button>
          )}

          <Button mode="contained" onPress={signOut} style={styles.actionBtn} icon="logout">
            Sign Out
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  userCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    marginBottom: 12,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  nameInput: {
    flex: 1,
    height: 48,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  householdInfoRow: {
    marginVertical: 4,
  },
  householdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  householdVal: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#F1F5F9',
  },
  inviteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteLeft: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  shareButton: {
    borderRadius: 8,
  },
  inviteHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  memberList: {
    marginVertical: 0,
  },
  youTag: {
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'center',
    marginRight: 8,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionsArea: {
    marginTop: 16,
  },
  actionBtn: {
    marginBottom: 12,
    borderRadius: 8,
    paddingVertical: 4,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cycleInput: {
    flex: 1,
    marginRight: 12,
    height: 48,
  },
  cycleSaveBtn: {
    borderRadius: 8,
    justifyContent: 'center',
    height: 48,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
