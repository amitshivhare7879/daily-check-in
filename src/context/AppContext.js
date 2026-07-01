import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '../services/supabase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [household, setHousehold] = useState(null);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [rates, setRates] = useState([]);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingEntries, setFetchingEntries] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ updateAvailable: false });

  const checkForUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'latest_version')
        .single();

      if (error) return;

      // Dynamically get the version code from the Android APK itself
      const currentVersionCode = parseInt(Application.nativeBuildVersion || '1', 10);
      
      if (data?.value?.version_code > currentVersionCode) {
        setUpdateInfo({
          updateAvailable: true,
          versionName: data.value.version_name,
          apkUrl: data.value.apk_url,
          forceUpdate: data.value.force_update,
          changelog: data.value.changelog,
        });
      }
    } catch (e) {
      console.log('Update check failed:', e.message);
    }
  };

  // Monitor Auth State
  useEffect(() => {
    checkForUpdates();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setHousehold(null);
        setHouseholdMembers([]);
        setRates([]);
        setDailyEntries([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch all user-related data (Profile, Household, Members, Rates, etc.)
  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user belongs to a household, fetch household details and members
      if (profileData.household_id) {
        await Promise.all([
          fetchHouseholdDetails(profileData.household_id),
          fetchHouseholdMembers(profileData.household_id),
          fetchRates(profileData.household_id),
          fetchDailyEntries(profileData.household_id)
        ]);
      } else {
        setHousehold(null);
        setHouseholdMembers([]);
        setRates([]);
        setDailyEntries([]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholdDetails = async (householdId) => {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();

    if (error) {
      console.error('Error fetching household details:', error.message);
      return;
    }
    setHousehold(data);
  };

  const fetchHouseholdMembers = async (householdId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id', 'name', 'email')
      .eq('household_id', householdId);

    if (error) {
      console.error('Error fetching household members:', error.message);
      return;
    }
    // Convert array fields if needed
    setHouseholdMembers(data || []);
  };

  const fetchRates = async (householdId) => {
    // Get all historical rates to construct billing calculations
    const { data, error } = await supabase
      .from('item_rates')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rates:', error.message);
      return;
    }
    setRates(data || []);
  };

  const fetchDailyEntries = async (householdId) => {
    setFetchingEntries(true);
    
    // Auto cleanup entries older than 60 days to save Supabase storage
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const cutoffDateStr = sixtyDaysAgo.toISOString().split('T')[0];
      
      await supabase
        .from('daily_entries')
        .delete()
        .eq('household_id', householdId)
        .lt('date', cutoffDateStr);
    } catch (cleanupError) {
      console.error('Error cleaning up old entries:', cleanupError.message);
    }

    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('household_id', householdId)
      .order('date', { ascending: false });

    setFetchingEntries(false);
    if (error) {
      console.error('Error fetching daily entries:', error.message);
      return;
    }
    setDailyEntries(data || []);
  };

  const updateBillingCycle = async (startDay) => {
    try {
      if (!profile?.household_id) throw new Error('No household associated');
      const startDayInt = parseInt(startDay, 10);
      if (isNaN(startDayInt) || startDayInt < 1 || startDayInt > 28) {
        throw new Error('Billing cycle start day must be between 1 and 28.');
      }
      
      const { error } = await supabase
        .from('households')
        .update({ billing_start_day: startDayInt })
        .eq('id', profile.household_id);

      if (error) throw error;
      setHousehold((prev) => ({ ...prev, billing_start_day: startDayInt }));
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Realtime Subscriptions for shared household data
  useEffect(() => {
    if (!profile?.household_id) return;

    const hId = profile.household_id;

    // Realtime channel for daily entries updates
    const entriesChannel = supabase
      .channel(`realtime-entries-${hId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_entries',
          filter: `household_id=eq.${hId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDailyEntries((prev) => {
              // Ensure we don't add duplicate
              if (prev.some(entry => entry.id === payload.new.id)) return prev;
              return [payload.new, ...prev].sort((a, b) => b.date.localeCompare(a.date));
            });
          } else if (payload.eventType === 'UPDATE') {
            setDailyEntries((prev) =>
              prev.map((entry) => (entry.id === payload.new.id ? payload.new : entry))
            );
          } else if (payload.eventType === 'DELETE') {
            setDailyEntries((prev) => prev.filter((entry) => entry.id === payload.old.id));
          }
        }
      )
      .subscribe();

    // Realtime channel for rates updates
    const ratesChannel = supabase
      .channel(`realtime-rates-${hId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_rates',
          filter: `household_id=eq.${hId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRates((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRates((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          }
        }
      )
      .subscribe();

    // Realtime channel for household profiles (in case partner joins or updates name)
    const profilesChannel = supabase
      .channel(`realtime-profiles-${hId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `household_id=eq.${hId}`,
        },
        () => {
          // Re-fetch household members when profiles changes
          fetchHouseholdMembers(hId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entriesChannel);
      supabase.removeChannel(ratesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [profile?.household_id]);

  // Auth Operations
  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Sign Out Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileName = async (newName) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: newName })
        .eq('id', user.id);

      if (error) throw error;
      setProfile((prev) => ({ ...prev, name: newName }));
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Household Operations
  const createHousehold = async (householdName) => {
    try {
      setLoading(true);
      // Generate a simple unique 6 character invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('households')
        .insert({
          name: householdName,
          created_by: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger will update profile household_id automatically
      // But we call fetchUserData to load everything into context
      await fetchUserData(user.id);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const joinHousehold = async (inviteCode) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('join_household', {
        code: inviteCode.trim().toUpperCase(),
      });

      if (error) throw error;

      // Re-load all user details to fetch household and details
      await fetchUserData(user.id);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const leaveHousehold = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('leave_household');
      if (error) throw error;

      setHousehold(null);
      setHouseholdMembers([]);
      setRates([]);
      setDailyEntries([]);
      setProfile((prev) => ({ ...prev, household_id: null }));
    } catch (error) {
      Alert.alert('Error Leaving Household', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Rates Operations
  const saveRate = async (itemType, rateValue, effectiveDate = null) => {
    try {
      if (!profile?.household_id) throw new Error('No household associated');

      const insertData = {
        household_id: profile.household_id,
        item_type: itemType,
        rate: parseFloat(rateValue),
        unit_label: itemType === 'milk' ? 'liter' : 'can',
      };

      if (effectiveDate) {
        insertData.created_at = `${effectiveDate}T00:00:00.000Z`;
      }

      const { data, error } = await supabase
        .from('item_rates')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Context state updates automatically via realtime subscription
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteRate = async (rateId) => {
    try {
      const { error } = await supabase
        .from('item_rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;
      setRates((prev) => prev.filter((r) => r.id !== rateId));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Daily Entries Operations
  const saveDailyEntry = async (date, milkQty, waterCanQty) => {
    try {
      if (!profile?.household_id) throw new Error('No household associated');

      const { data, error } = await supabase
        .from('daily_entries')
        .upsert(
          {
            household_id: profile.household_id,
            user_id: user.id,
            date,
            milk_qty: parseFloat(milkQty),
            water_can_qty: parseInt(waterCanQty, 10),
          },
          { onConflict: 'household_id,date' }
        )
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteDailyEntry = async (date) => {
    try {
      if (!profile?.household_id) throw new Error('No household associated');

      const { error } = await supabase
        .from('daily_entries')
        .delete()
        .eq('household_id', profile.household_id)
        .eq('date', date);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Get rate for a specific date (crucial for accurate calculations when rates change over time)
  const getRateForDate = (itemType, targetDate) => {
    if (!rates || rates.length === 0) return 0;

    // Filter rates for specific item type
    const itemRates = rates.filter((r) => r.item_type === itemType);
    if (itemRates.length === 0) return 0;

    // Find the newest rate created at or before targetDate
    // rates are already ordered by created_at DESC in fetchRates
    
    // Fallback to the oldest rate if no rate is older than the entry date
    let selectedRate = itemRates[itemRates.length - 1].rate;
    
    for (let r of itemRates) {
      // Compare dates. We check if the rate was set before or on the entry day
      // Note: we extract just the date portion of rate's created_at for a fair daily comparison
      const rateDateOnlyStr = r.created_at.split('T')[0];
      if (rateDateOnlyStr <= targetDate) {
        selectedRate = r.rate;
        break;
      }
    }
    
    return parseFloat(selectedRate);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        user,
        profile,
        household,
        householdMembers,
        rates,
        dailyEntries,
        loading,
        fetchingEntries,
        signUp,
        signIn,
        signOut,
        updateProfileName,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        saveRate,
        deleteRate,
        saveDailyEntry,
        deleteDailyEntry,
        getRateForDate,
        fetchDailyEntries,
        updateBillingCycle,
        updateInfo,
        checkForUpdates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
