import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, List, useTheme, IconButton, Divider } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function RateSettingsScreen({ navigation }) {
  const { rates, saveRate, deleteRate, getRateForDate } = useApp();
  const theme = useTheme();

  const todayStr = new Date().toISOString().split('T')[0];
  const activeMilkRate = getRateForDate('milk', todayStr);
  const activeWaterRate = getRateForDate('water_can', todayStr);

  const [milkRate, setMilkRate] = useState(activeMilkRate.toString());
  const [waterRate, setWaterRate] = useState(activeWaterRate.toString());
  
  // Date states for the rate increase starting day
  const [milkEffectiveDate, setMilkEffectiveDate] = useState(todayStr);
  const [waterEffectiveDate, setWaterEffectiveDate] = useState(todayStr);

  const [savingMilk, setSavingMilk] = useState(false);
  const [savingWater, setSavingWater] = useState(false);

  const handleMilkRateChange = (text) => {
    let cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
    }
    setMilkRate(cleaned);
  };

  const handleWaterRateChange = (text) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length > 1) {
      cleaned = cleaned.replace(/^0+/, '');
    }
    setWaterRate(cleaned);
  };

  const isValidDate = (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateStr.match(regex)) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const handleSaveMilk = async () => {
    if (!milkRate || isNaN(milkRate) || parseFloat(milkRate) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid rate for milk.');
      return;
    }
    if (!isValidDate(milkEffectiveDate)) {
      Alert.alert('Validation Error', 'Please enter a valid date in YYYY-MM-DD format (e.g., 2026-06-30).');
      return;
    }

    setSavingMilk(true);
    const { error } = await saveRate('milk', milkRate, milkEffectiveDate);
    setSavingMilk(false);

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      Alert.alert('Success', `Milk rate updated to ₹${milkRate}/L effective from ${milkEffectiveDate}`);
    }
  };

  const handleSaveWater = async () => {
    if (!waterRate || isNaN(waterRate) || parseFloat(waterRate) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid rate for water cans.');
      return;
    }
    if (!isValidDate(waterEffectiveDate)) {
      Alert.alert('Validation Error', 'Please enter a valid date in YYYY-MM-DD format (e.g., 2026-06-30).');
      return;
    }

    setSavingWater(true);
    const { error } = await saveRate('water_can', waterRate, waterEffectiveDate);
    setSavingWater(false);

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      Alert.alert('Success', `Water Can rate updated to ₹${waterRate}/Can effective from ${waterEffectiveDate}`);
    }
  };

  const handleDeleteRate = (id, rate, unit) => {
    Alert.alert(
      'Delete Rate Entry',
      `Are you sure you want to delete the rate ₹${rate}/${unit} from history? Calculations will automatically revert to other historical rates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteRate(id);
            if (error) {
              Alert.alert('Error', 'Failed to delete rate: ' + error.message + '\n\nMake sure your Supabase DB has the delete policy enabled.');
            } else {
              Alert.alert('Success', 'Rate entry deleted successfully.');
            }
          },
        },
      ]
    );
  };

  // Format timestamp: e.g. "12 Jun 2026, 06:15 PM"
  const formatTimestamp = (timestampStr) => {
    const d = new Date(timestampStr);
    return d.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back navigation header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} style={styles.backBtn} />
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Rate Management</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Set unit prices and effective dates. Past logs keep their original rates.
            </Text>
          </View>
        </View>

        {/* Milk Rate Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.inputTitleRow}>
              <IconButton icon="water" iconColor={theme.colors.milk} size={28} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Milk Rate Settings</Text>
            </View>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Set the price of milk per liter. Standard packages are calculated based on this unit price.
            </Text>
            
            <View style={styles.formFields}>
              <TextInput
                label="New Rate per Liter (₹)"
                value={milkRate}
                onChangeText={handleMilkRateChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.fullWidthInput}
                dense
              />
              <TextInput
                label="Effective From (YYYY-MM-DD)"
                value={milkEffectiveDate}
                onChangeText={setMilkEffectiveDate}
                mode="outlined"
                style={styles.fullWidthInput}
                dense
              />
              <Button
                mode="contained"
                onPress={handleSaveMilk}
                loading={savingMilk}
                disabled={savingMilk}
                style={styles.saveBtn}
              >
                Update Milk Rate
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Water Can Rate Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.inputTitleRow}>
              <IconButton icon="cup-water" iconColor={theme.colors.water} size={28} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Water Can Settings</Text>
            </View>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Set the price per standard water can.
            </Text>
            
            <View style={styles.formFields}>
              <TextInput
                label="New Rate per Can (₹)"
                value={waterRate}
                onChangeText={handleWaterRateChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.fullWidthInput}
                dense
              />
              <TextInput
                label="Effective From (YYYY-MM-DD)"
                value={waterEffectiveDate}
                onChangeText={setWaterEffectiveDate}
                mode="outlined"
                style={styles.fullWidthInput}
                dense
              />
              <Button
                mode="contained"
                onPress={handleSaveWater}
                loading={savingWater}
                disabled={savingWater}
                style={styles.saveBtn}
                buttonColor={theme.colors.secondary}
              >
                Update Water Rate
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Rate History */}
        <Text style={[styles.historyTitle, { color: theme.colors.text }]}>Rate Update History</Text>
        <Card style={styles.historyCard} mode="outlined">
          {rates.length === 0 ? (
            <Card.Content style={styles.emptyHistory}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No history of rate changes yet.</Text>
            </Card.Content>
          ) : (
            rates.map((item, index) => (
              <View key={item.id}>
                <List.Item
                  title={`₹${item.rate} per ${item.unit_label}`}
                  description={`Effective since: ${formatTimestamp(item.created_at)}`}
                  left={(props) => (
                    <IconButton
                      {...props}
                      icon={item.item_type === 'milk' ? 'water' : 'cup-water'}
                      iconColor={item.item_type === 'milk' ? theme.colors.milk : theme.colors.water}
                      size={24}
                    />
                  )}
                  right={(props) => (
                    <IconButton
                      {...props}
                      icon="delete-outline"
                      iconColor={theme.colors.error}
                      onPress={() => handleDeleteRate(item.id, item.rate, item.unit_label === 'liter' ? 'L' : 'Can')}
                    />
                  )}
                />
                {index < rates.length - 1 && <Divider />}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  backBtn: {
    margin: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    paddingRight: 32,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  inputTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 4,
  },
  cardIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  formFields: {
    flexDirection: 'column',
    gap: 12,
  },
  fullWidthInput: {
    width: '100%',
  },
  saveBtn: {
    borderRadius: 8,
    justifyContent: 'center',
    height: 48,
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
  },
  historyCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 16,
  },
});
