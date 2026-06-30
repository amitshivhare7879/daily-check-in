import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Text, Card, IconButton, Divider, useTheme, List } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function SummaryScreen() {
  const { dailyEntries, getRateForDate, household } = useApp();
  const theme = useTheme();

  // State to track which month is expanded
  const [expandedMonth, setExpandedMonth] = useState(null);

  // Group entries by billing cycle
  const getMonthlyData = () => {
    const billingStartDay = household?.billing_start_day || 1;
    const monthlyGroups = {};

    // Helper to get billing period key (e.g. "2026-06" for period starting Jun 5)
    const getBillingPeriodKey = (dateStr, startDay) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (day >= startDay) {
        return `${year}-${month.toString().padStart(2, '0')}`;
      } else {
        const prevMonthDate = new Date(year, month - 2, 1);
        const pYear = prevMonthDate.getFullYear();
        const pMonth = (prevMonthDate.getMonth() + 1).toString().padStart(2, '0');
        return `${pYear}-${pMonth}`;
      }
    };

    dailyEntries.forEach((entry) => {
      const monthKey = getBillingPeriodKey(entry.date, billingStartDay);
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(entry);
    });

    // Process each group to calculate totals
    const processed = Object.keys(monthlyGroups).map((monthKey) => {
      const entries = monthlyGroups[monthKey].sort((a, b) => b.date.localeCompare(a.date));
      let milkQty = 0;
      let waterQty = 0;
      let milkCost = 0;
      let waterCost = 0;

      entries.forEach((e) => {
        const mQty = parseFloat(e.milk_qty);
        const wQty = parseInt(e.water_can_qty, 10);
        const mRate = getRateForDate('milk', e.date);
        const wRate = getRateForDate('water_can', e.date);

        milkQty += mQty;
        waterQty += wQty;
        milkCost += mQty * mRate;
        waterCost += wQty * wRate;
      });

      const totalCost = milkCost + waterCost;

      // Calculate the start and end dates of this specific billing period to display them in the subtitle
      const [year, month] = monthKey.split('-').map(Number);
      const startD = new Date(year, month - 1, billingStartDay);
      const endD = new Date(year, month, billingStartDay - 1, 23, 59, 59);
      
      const title = startD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dateRangeLabel = billingStartDay === 1 
        ? '' 
        : ` (${startD.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${endD.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`;

      return {
        key: monthKey,
        title: `${title}${dateRangeLabel}`,
        milkQty,
        waterQty,
        milkCost,
        waterCost,
        totalCost,
        entries,
      };
    });

    // Sort months descending
    return processed.sort((a, b) => b.key.localeCompare(a.key));
  };

  const monthlySummaries = getMonthlyData();

  const toggleExpand = (key) => {
    if (expandedMonth === key) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(key);
    }
  };

  const formatDateLabel = (dateStr) => {
    const [,,, day] = dateStr.split('-'); // YYYY-MM-DD
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Monthly Billings</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Historical monthly spend and breakdown of consumable logs.
          </Text>
        </View>

        {monthlySummaries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <IconButton icon="chart-donut" size={48} iconColor={theme.colors.outline} />
              <Text style={styles.emptyText}>No monthly summaries available.</Text>
              <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
                Start checking in consumables in the Dashboard or Calendar screens to compile histories.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          monthlySummaries.map((month) => {
            const isExpanded = expandedMonth === month.key;
            return (
              <Card key={month.key} style={styles.monthCard} mode="elevated">
                <Card.Content style={styles.cardHeaderPressable}>
                  <View style={styles.monthHeaderRow}>
                    <View>
                      <Text style={styles.monthTitle}>{month.title}</Text>
                      <Text style={[styles.itemSummaryText, { color: theme.colors.onSurfaceVariant }]}>
                        {month.milkQty.toFixed(1)}L Milk • {month.waterQty} Cans Water
                      </Text>
                    </View>
                    <View style={styles.rightHeaderBlock}>
                      <Text style={[styles.monthTotal, { color: theme.colors.secondary }]}>
                        ₹{month.totalCost.toFixed(0)}
                      </Text>
                      <IconButton
                        icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        onPress={() => toggleExpand(month.key)}
                        style={styles.expandIcon}
                      />
                    </View>
                  </View>
                </Card.Content>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Divider style={styles.sectionDivider} />

                    {/* Breakdown */}
                    <Text style={styles.breakdownHeader}>Cost Breakdown</Text>
                    
                    <View style={styles.breakdownRow}>
                      <View style={styles.breakdownLabelGroup}>
                        <View style={[styles.bulletDot, { backgroundColor: theme.colors.milk }]} />
                        <Text style={styles.breakdownLabel}>Milk Cost ({month.milkQty.toFixed(1)} L)</Text>
                      </View>
                      <Text style={styles.breakdownVal}>₹{month.milkCost.toFixed(2)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <View style={styles.breakdownLabelGroup}>
                        <View style={[styles.bulletDot, { backgroundColor: theme.colors.water }]} />
                        <Text style={styles.breakdownLabel}>Water Cans Cost ({month.waterQty} Cans)</Text>
                      </View>
                      <Text style={styles.breakdownVal}>₹{month.waterCost.toFixed(2)}</Text>
                    </View>

                    <Divider style={styles.subDivider} />

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Grand Total</Text>
                      <Text style={[styles.totalVal, { color: theme.colors.primary }]}>
                        ₹{month.totalCost.toFixed(2)}
                      </Text>
                    </View>

                    {/* Daily Entries Itemized */}
                    <Text style={styles.breakdownHeader}>Itemized Daily Logs</Text>
                    <View style={styles.entriesTable}>
                      {month.entries.map((entry) => {
                        const mRate = getRateForDate('milk', entry.date);
                        const wRate = getRateForDate('water_can', entry.date);
                        const dayCost = (parseFloat(entry.milk_qty) * mRate) + (parseInt(entry.water_can_qty, 10) * wRate);

                        return (
                          <View key={entry.id} style={styles.entryRow}>
                            <Text style={styles.entryDate}>{formatDateLabel(entry.date)}</Text>
                            <View style={styles.entryQuantities}>
                              {parseFloat(entry.milk_qty) > 0 && (
                                <Text style={[styles.entryQtyBadge, { color: theme.colors.milk }]}>
                                  {parseFloat(entry.milk_qty)} L
                                </Text>
                              )}
                              {parseInt(entry.water_can_qty, 10) > 0 && (
                                <Text style={[styles.entryQtyBadge, { color: theme.colors.water, marginLeft: 8 }]}>
                                  {entry.water_can_qty} Can
                                </Text>
                              )}
                            </View>
                            <Text style={styles.entryCost}>₹{dayCost.toFixed(1)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        )}
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
  emptyCard: {
    borderRadius: 16,
    marginTop: 24,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  monthCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeaderPressable: {
    paddingVertical: 12,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemSummaryText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  rightHeaderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTotal: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 4,
  },
  expandIcon: {
    margin: 0,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  breakdownHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  subDivider: {
    marginVertical: 12,
    backgroundColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  entriesTable: {
    marginTop: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
  },
  entryQuantities: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  entryQtyBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  entryCost: {
    fontSize: 13,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
  },
});
