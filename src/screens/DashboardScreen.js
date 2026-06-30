import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Portal, Dialog, TextInput, IconButton, useTheme, Surface } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function DashboardScreen({ navigation }) {
  const {
    household,
    dailyEntries,
    getRateForDate,
    saveDailyEntry,
    saveRate,
    rates,
    fetchingEntries,
    fetchDailyEntries,
    updateInfo
  } = useApp();
  const theme = useTheme();

  // Dialog states for editing rates
  const [rateDialogVisible, setRateDialogVisible] = useState(false);
  const [editingItemType, setEditingItemType] = useState(null); // 'milk' | 'water_can'
  const [newRateValue, setNewRateValue] = useState('');
  const [updateAlertDismissed, setUpdateAlertDismissed] = useState(false);

  const handleNewRateValueChange = (text) => {
    if (editingItemType === 'milk') {
      let cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
        cleaned = cleaned.replace(/^0+/, '');
      }
      setNewRateValue(cleaned);
    } else {
      let cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0') && cleaned.length > 1) {
        cleaned = cleaned.replace(/^0+/, '');
      }
      setNewRateValue(cleaned);
    }
  };

  // Local state for today's quick logger
  const [todayMilk, setTodayMilk] = useState(0);
  const [todayWater, setTodayWater] = useState(0);
  const [todayEntryId, setTodayEntryId] = useState(null);
  const [savingToday, setSavingToday] = useState(false);

  // Get date strings
  const getTodayDateString = () => {
    const d = new Date();
    // Format local date as YYYY-MM-DD
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getTodayDateString();

  // Sync today's local state when database entries load
  useEffect(() => {
    const todayEntry = dailyEntries.find((entry) => entry.date === todayStr);
    if (todayEntry) {
      setTodayMilk(parseFloat(todayEntry.milk_qty));
      setTodayWater(parseInt(todayEntry.water_can_qty, 10));
      setTodayEntryId(todayEntry.id);
    } else {
      setTodayMilk(0);
      setTodayWater(0);
      setTodayEntryId(null);
    }
  }, [dailyEntries, todayStr]);

  // Helper to get start and end dates of the current billing period
  const getBillingPeriodRange = (billingStartDay = 1) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const date = today.getDate();

    let startDate, endDate;

    if (date >= billingStartDay) {
      startDate = new Date(year, month, billingStartDay);
      endDate = new Date(year, month + 1, billingStartDay - 1, 23, 59, 59);
    } else {
      startDate = new Date(year, month - 1, billingStartDay);
      endDate = new Date(year, month, billingStartDay - 1, 23, 59, 59);
    }

    return {
      startStr: startDate.toISOString().split('T')[0],
      endStr: endDate.toISOString().split('T')[0],
    };
  };

  const billingStartDay = household?.billing_start_day || 1;
  const { startStr, endStr } = getBillingPeriodRange(billingStartDay);

  const formatPeriodLabel = () => {
    const startD = new Date(startStr);
    const endD = new Date(endStr);
    const options = { day: 'numeric', month: 'short' };
    return `Cycle: ${startD.toLocaleDateString('en-US', options)} - ${endD.toLocaleDateString('en-US', options)}`;
  };

  // Filter entries belonging to the current billing period
  const currentBillingEntries = dailyEntries.filter(
    (entry) => entry.date >= startStr && entry.date <= endStr
  );

  const totalMilk = currentBillingEntries.reduce((sum, entry) => sum + parseFloat(entry.milk_qty), 0);
  const totalWater = currentBillingEntries.reduce((sum, entry) => sum + parseInt(entry.water_can_qty, 10), 0);

  // Compute total cost by applying historical rate on the day of entry
  const totalCost = currentBillingEntries.reduce((sum, entry) => {
    const milkRate = getRateForDate('milk', entry.date);
    const waterRate = getRateForDate('water_can', entry.date);
    const cost = (parseFloat(entry.milk_qty) * milkRate) + (parseInt(entry.water_can_qty, 10) * waterRate);
    return sum + cost;
  }, 0);

  // Get active rates to display on dashboard
  const activeMilkRate = getRateForDate('milk', todayStr);
  const activeWaterRate = getRateForDate('water_can', todayStr);

  const openRateDialog = (type) => {
    setEditingItemType(type);
    setNewRateValue(type === 'milk' ? activeMilkRate.toString() : activeWaterRate.toString());
    setRateDialogVisible(true);
  };

  const handleSaveRate = async () => {
    if (!newRateValue || isNaN(newRateValue) || parseFloat(newRateValue) < 0) {
      alert('Please enter a valid rate.');
      return;
    }
    const { error } = await saveRate(editingItemType, newRateValue);
    if (error) {
      alert(`Failed to save rate: ${error.message}`);
    } else {
      setRateDialogVisible(false);
    }
  };

  const handleSaveTodayEntry = async () => {
    setSavingToday(true);
    const { error } = await saveDailyEntry(todayStr, todayMilk, todayWater);
    setSavingToday(false);
    if (error) {
      alert(`Failed to log entry: ${error.message}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={fetchingEntries}
            onRefresh={() => fetchDailyEntries(household?.id)}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Household Header */}
        <View style={styles.header}>
          <Text style={[styles.householdName, { color: theme.colors.text }]}>
            {household?.name || 'My Household'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Shared Dashboard • {formatPeriodLabel()}
          </Text>
        </View>

        {/* Monthly Running Summary Card */}
        <Card style={styles.summaryCard} mode="elevated">
          <Card.Content style={styles.summaryCardContent}>
            <Text style={[styles.summaryTitle, { color: theme.colors.primary }]}>
              THIS MONTH'S TOTALS
            </Text>
            <View style={styles.totalsRow}>
              <View style={styles.totalBlock}>
                <IconButton icon="water" iconColor={theme.colors.milk} size={28} style={styles.totalIcon} />
                <Text style={styles.totalVal}>{totalMilk.toFixed(1)} L</Text>
                <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Milk Logged</Text>
              </View>

              <View style={styles.totalBlock}>
                <IconButton icon="cup-water" iconColor={theme.colors.water} size={28} style={styles.totalIcon} />
                <Text style={styles.totalVal}>{totalWater} Cans</Text>
                <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Water Cans</Text>
              </View>

              <View style={styles.totalBlock}>
                <IconButton icon="currency-inr" iconColor={theme.colors.secondary} size={28} style={styles.totalIcon} />
                <Text style={styles.totalVal}>₹{totalCost.toFixed(2)}</Text>
                <Text style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}>Est. Spend</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Today's Log Card */}
        <Card style={styles.logCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Today's Consumables</Text>
                <Text style={[styles.cardDate, { color: theme.colors.onSurfaceVariant }]}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Surface
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: todayEntryId
                      ? theme.colors.secondaryContainer
                      : theme.colors.surfaceVariant,
                  },
                ]}
                elevation={0}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: todayEntryId
                        ? theme.colors.secondary
                        : theme.colors.onSurfaceVariant,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {todayEntryId ? 'LOGGED' : 'PENDING'}
                </Text>
              </Surface>
            </View>

            {/* Milk Controls */}
            <View style={styles.logRow}>
              <View style={styles.logLeft}>
                <IconButton icon="water" iconColor={theme.colors.milk} size={28} />
                <View>
                  <Text style={styles.itemLabel}>Milk Quantity</Text>
                  <Text style={[styles.rateLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Rate: ₹{activeMilkRate}/L
                  </Text>
                </View>
              </View>
              <View style={styles.logRight}>
                <IconButton
                  icon="minus-circle-outline"
                  size={24}
                  onPress={() => setTodayMilk((prev) => Math.max(0, prev - 0.5))}
                />
                <Text style={styles.qtyText}>{todayMilk.toFixed(1)} L</Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={() => setTodayMilk((prev) => prev + 0.5)}
                />
              </View>
            </View>

            {/* Water Controls */}
            <View style={styles.logRow}>
              <View style={styles.logLeft}>
                <IconButton icon="cup-water" iconColor={theme.colors.water} size={28} />
                <View>
                  <Text style={styles.itemLabel}>Water Cans</Text>
                  <Text style={[styles.rateLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Rate: ₹{activeWaterRate}/Can
                  </Text>
                </View>
              </View>
              <View style={styles.logRight}>
                <IconButton
                  icon="minus-circle-outline"
                  size={24}
                  onPress={() => setTodayWater((prev) => Math.max(0, prev - 1))}
                />
                <Text style={styles.qtyText}>{todayWater}</Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={() => setTodayWater((prev) => prev + 1)}
                />
              </View>
            </View>

            <Button
              mode="contained"
              loading={savingToday}
              disabled={savingToday}
              onPress={handleSaveTodayEntry}
              style={styles.saveButton}
              icon="check-circle"
            >
              {todayEntryId ? 'Update Check-in' : 'Check-in Today'}
            </Button>
          </Card.Content>
        </Card>

        {/* Quick Rate Editor Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Active Unit Rates</Text>
        <View style={styles.ratesContainer}>
          <Card
            style={[styles.rateCard, { flex: 1, marginRight: 8 }]}
            onPress={() => navigation.navigate('RateSettings')}
            mode="outlined"
          >
            <Card.Content style={styles.rateCardContent}>
              <IconButton icon="water" iconColor={theme.colors.milk} size={24} style={styles.rateIcon} />
              <Text style={styles.rateCardTitle}>Milk Rate</Text>
              <Text style={styles.rateCardValue}>₹{activeMilkRate}/L</Text>
              <Text style={[styles.rateCardHint, { color: theme.colors.primary }]}>Tap to edit</Text>
            </Card.Content>
          </Card>

          <Card
            style={[styles.rateCard, { flex: 1, marginLeft: 8 }]}
            onPress={() => navigation.navigate('RateSettings')}
            mode="outlined"
          >
            <Card.Content style={styles.rateCardContent}>
              <IconButton icon="cup-water" iconColor={theme.colors.water} size={24} style={styles.rateIcon} />
              <Text style={styles.rateCardTitle}>Water Can</Text>
              <Text style={styles.rateCardValue}>₹{activeWaterRate}/Can</Text>
              <Text style={[styles.rateCardHint, { color: theme.colors.primary }]}>Tap to edit</Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* Edit Rate Dialog */}
      <Portal>
        <Dialog visible={rateDialogVisible} onDismiss={() => setRateDialogVisible(false)}>
          <Dialog.Title>Update {editingItemType === 'milk' ? 'Milk Rate' : 'Water Can Rate'}</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogText, { color: theme.colors.onSurfaceVariant }]}>
              Enter the rate. Note: Updates apply only to future check-ins. Historical summaries will preserve rates active on those past log dates.
            </Text>
            <TextInput
              label={editingItemType === 'milk' ? 'Rate per Liter (₹)' : 'Rate per Can (₹)'}
              value={newRateValue}
              onChangeText={handleNewRateValueChange}
              keyboardType="numeric"
              mode="outlined"
              style={styles.dialogInput}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveRate} mode="contained">Save Rate</Button>
          </Dialog.Actions>
        </Dialog>

        {/* App Update Dialog */}
        <Dialog visible={updateInfo.updateAvailable && !updateAlertDismissed} dismissable={!updateInfo.forceUpdate} onDismiss={() => setUpdateAlertDismissed(true)}>
          <Dialog.Title>Update Available! 🚀</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogText, { color: theme.colors.onSurfaceVariant, marginBottom: 12 }]}>
              A new version ({updateInfo.versionName}) of Daily Tracker is available.
            </Text>
            {updateInfo.changelog ? (
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#475569', marginBottom: 4 }}>What's New:</Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>{updateInfo.changelog}</Text>
              </View>
            ) : null}
            {updateInfo.forceUpdate && (
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>
                * This is a required update. Please install the new version to continue.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {!updateInfo.forceUpdate && (
              <Button onPress={() => setUpdateAlertDismissed(true)}>Later</Button>
            )}
            <Button onPress={() => Linking.openURL(updateInfo.apkUrl)} mode="contained" style={{ borderRadius: 8 }}>
              Download Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  householdName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
  },
  summaryCardContent: {
    paddingVertical: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalBlock: {
    alignItems: 'center',
  },
  totalIcon: {
    margin: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  logCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingRight: 6,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  ratesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateCard: {
    borderRadius: 12,
  },
  rateCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  rateIcon: {
    margin: 0,
  },
  rateCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  rateCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  rateCardHint: {
    fontSize: 11,
    fontWeight: '700',
  },
  dialogText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dialogInput: {
    marginTop: 8,
  },
});
