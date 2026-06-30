import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Portal, Dialog, Button, IconButton, useTheme, Card } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useApp } from '../context/AppContext';

export default function CalendarScreen() {
  const { dailyEntries, getRateForDate, saveDailyEntry, deleteDailyEntry } = useApp();
  const theme = useTheme();

  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [milkQty, setMilkQty] = useState(0);
  const [waterQty, setWaterQty] = useState(0);
  const [hasExistingEntry, setHasExistingEntry] = useState(false);
  const [saving, setSaving] = useState(false);

  // Compute marked dates for the calendar
  const getMarkedDates = () => {
    const marked = {};

    dailyEntries.forEach((entry) => {
      const dots = [];
      if (parseFloat(entry.milk_qty) > 0) {
        dots.push({ key: 'milk', color: theme.colors.milk, selectedDotColor: '#FFFFFF' });
      }
      if (parseInt(entry.water_can_qty, 10) > 0) {
        dots.push({ key: 'water', color: theme.colors.water, selectedDotColor: '#FFFFFF' });
      }

      if (dots.length > 0) {
        marked[entry.date] = {
          dots,
          markingType: 'multi-dot',
        };
      }
    });

    // Highlight the selected date if there is one
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: '#FFFFFF',
      };
    }

    return marked;
  };

  // Open entry editor when a date is selected
  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    const existingEntry = dailyEntries.find((e) => e.date === dateStr);
    if (existingEntry) {
      setMilkQty(parseFloat(existingEntry.milk_qty));
      setWaterQty(parseInt(existingEntry.water_can_qty, 10));
      setHasExistingEntry(true);
    } else {
      setMilkQty(0);
      setWaterQty(0);
      setHasExistingEntry(false);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveDailyEntry(selectedDate, milkQty, waterQty);
    setSaving(false);

    if (error) {
      Alert.alert('Error Saving Entry', error.message);
    } else {
      setModalVisible(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to clear logs for ${selectedDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const { error } = await deleteDailyEntry(selectedDate);
            setSaving(false);
            if (error) {
              Alert.alert('Error Deleting', error.message);
            } else {
              setModalVisible(false);
            }
          },
        },
      ]
    );
  };

  // Format date for title display: e.g. "12 Jun 2026"
  const formatDateTitle = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeMilkRate = selectedDate ? getRateForDate('milk', selectedDate) : 0;
  const activeWaterRate = selectedDate ? getRateForDate('water_can', selectedDate) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Calendar History</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Tap a date to log consumables or review household entries.
          </Text>
        </View>

        <Card style={styles.calendarCard} mode="elevated">
          <Calendar
            markingType="multi-dot"
            markedDates={getMarkedDates()}
            onDayPress={handleDayPress}
            theme={{
              backgroundColor: theme.colors.surface,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.onSurfaceVariant,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.outline,
              dotColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
              indicatorColor: theme.colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </Card>

        {/* Legend */}
        <Card style={styles.legendCard} mode="outlined">
          <Card.Content style={styles.legendContent}>
            <Text style={styles.legendTitle}>Legend:</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: theme.colors.milk }]} />
                <Text style={styles.legendText}>Milk Delivered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: theme.colors.water }]} />
                <Text style={styles.legendText}>Water Can Delivered</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Daily Entry Modal */}
      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{formatDateTitle(selectedDate)}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            
            {/* Milk Qty */}
            <View style={styles.inputRow}>
              <View style={styles.inputLeft}>
                <IconButton icon="water" iconColor={theme.colors.milk} size={28} />
                <View>
                  <Text style={styles.itemTitle}>Milk Log</Text>
                  <Text style={[styles.rateInfo, { color: theme.colors.onSurfaceVariant }]}>
                    Rate: ₹{activeMilkRate}/L
                  </Text>
                </View>
              </View>
              <View style={styles.inputRight}>
                <IconButton
                  icon="minus-circle-outline"
                  size={24}
                  onPress={() => setMilkQty((prev) => Math.max(0, prev - 0.5))}
                />
                <Text style={styles.qtyText}>{milkQty.toFixed(1)} L</Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={() => setMilkQty((prev) => prev + 0.5)}
                />
              </View>
            </View>

            {/* Water Qty */}
            <View style={styles.inputRow}>
              <View style={styles.inputLeft}>
                <IconButton icon="cup-water" iconColor={theme.colors.water} size={28} />
                <View>
                  <Text style={styles.itemTitle}>Water Cans</Text>
                  <Text style={[styles.rateInfo, { color: theme.colors.onSurfaceVariant }]}>
                    Rate: ₹{activeWaterRate}/Can
                  </Text>
                </View>
              </View>
              <View style={styles.inputRight}>
                <IconButton
                  icon="minus-circle-outline"
                  size={24}
                  onPress={() => setWaterQty((prev) => Math.max(0, prev - 1))}
                />
                <Text style={styles.qtyText}>{waterQty}</Text>
                <IconButton
                  icon="plus-circle-outline"
                  size={24}
                  onPress={() => setWaterQty((prev) => prev + 1)}
                />
              </View>
            </View>

            {/* Cost Preview */}
            <View style={[styles.previewBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.previewLabel}>Estimated Cost for Day:</Text>
              <Text style={[styles.previewValue, { color: theme.colors.primary }]}>
                ₹{((milkQty * activeMilkRate) + (waterQty * activeWaterRate)).toFixed(2)}
              </Text>
            </View>

          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            {hasExistingEntry && (
              <Button
                onPress={handleDelete}
                textColor={theme.colors.error}
                style={styles.deleteBtn}
                icon="delete"
                disabled={saving}
              >
                Clear
              </Button>
            )}
            <View style={styles.actionRight}>
              <Button onPress={() => setModalVisible(false)} disabled={saving}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveBtn}
                disabled={saving}
                loading={saving}
              >
                Save
              </Button>
            </View>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 20,
  },
  calendarCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 16,
  },
  legendCard: {
    borderRadius: 12,
    marginTop: 8,
  },
  legendContent: {
    paddingVertical: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  dialogContent: {
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingRight: 6,
  },
  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rateInfo: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  deleteBtn: {
    margin: 0,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    marginLeft: 8,
    borderRadius: 8,
  },
});
