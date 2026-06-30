import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import { useApp } from '../context/AppContext';

export default function AuthScreen() {
  const { signIn, signUp } = useApp();
  const theme = useTheme();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email.trim(), password, name.trim());
        if (signUpError) {
          setError(signUpError.message);
        } else {
          // Supabase auto-signs in or sends verification
          Alert.alert('Sign Up Successful', 'Account created! Logging in...');
        }
      } else {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) {
          setError(signInError.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={[styles.appName, { color: theme.colors.primary }]}>Daily Tracker</Text>
          <Text style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            Household Consumable Tracker
          </Text>
        </View>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {isSignUp ? 'Sign up to start tracking milk and water cans with your household' : 'Welcome back! Log in to sync shared data.'}
            </Text>

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            {isSignUp && (
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
                autoCapitalize="words"
              />
            )}

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              secureTextEntry
              autoCapitalize="none"
            />

            {loading ? (
              <ActivityIndicator animating={true} color={theme.colors.primary} style={styles.spinner} />
            ) : (
              <Button mode="contained" onPress={handleSubmit} style={styles.button}>
                {isSignUp ? 'Register' : 'Log In'}
              </Button>
            )}

            <Button
              mode="text"
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={styles.toggleButton}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleButton: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  spinner: {
    marginVertical: 16,
  },
});
