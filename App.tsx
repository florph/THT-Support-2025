import './global.css';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import TicketDetailScreen from './screens/TicketDetailScreen';
import { RootStackParamList } from './types/navigation';

type AuthState = {
  token: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  user: { name?: string; email?: string; role?: 'admin' | 'user' } | null;
};

type AuthContextType = {
  authState: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const {
    authState: { authenticated, loading },
  } = useAuth() as AuthContextType;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();

  return (
    <AuthProvider>
      <Navigation />
      <FlashMessage position="top" floating statusBarHeight={insets.top} />
    </AuthProvider>
  );
}

export default function App() {
  // The app references "Poppins" / "Poppins-Medium" / "Poppins-SemiBold" throughout
  // (via NativeWind's font-poppins and explicit fontFamily). Load them up front so
  // text doesn't silently fall back to the system font.
  const [fontsLoaded] = useFonts({
    Poppins: Poppins_400Regular,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
