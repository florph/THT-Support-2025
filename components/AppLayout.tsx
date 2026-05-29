import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

type User = {
  name?: string;
  email?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
};

type AuthContextType = {
  authState: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

type AppLayoutProps = {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
  showMenu?: boolean;
  onBackPress?: () => void;
};

export function AppLayout({
  children,
  title,
  headerRight,
  showMenu = true,
  onBackPress,
}: AppLayoutProps) {
  const { logout, authState } = useAuth() as AuthContextType;
  const navigation = useNavigation<any>();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const menuItems = [{ icon: 'headset', label: 'Support Tickets', route: 'Home' }];

  return (
    <View className="flex-1 bg-[#111827]">
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} className="bg-[#1f2937]">
        <View
          className="flex-row items-center justify-between border-b border-gray-700 px-4"
          style={{
            height: 64,
            marginTop: Platform.OS === 'android' ? -4 : 0,
            paddingVertical: 8,
          }}>
          <View className="flex-row items-center space-x-3">
            {showMenu ? (
              <TouchableOpacity
                onPress={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 hover:bg-gray-700">
                <MaterialIcons name="menu" size={24} color="#e5e7eb" />
              </TouchableOpacity>
            ) : (
              onBackPress && (
                <TouchableOpacity
                  onPress={onBackPress}
                  className="rounded-lg p-1.5 hover:bg-gray-700"
                  style={{ marginRight: 8 }}>
                  <MaterialIcons name="arrow-back" size={24} color="#e5e7eb" />
                </TouchableOpacity>
              )
            )}
            <Text className="font-poppins text-lg font-semibold text-white">{title}</Text>
          </View>
          {headerRight}
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#111827]">
        {children}
      </SafeAreaView>

      {/* Side Menu with Overlay - Placed last for stacking */}
      {showMenu && menuOpen && (
        <>
          {/* Overlay using TouchableOpacity */}
          <TouchableOpacity
            activeOpacity={1} // Use 1 for no visual feedback on overlay press
            onPress={() => setMenuOpen(false)} // Close menu on press
            style={StyleSheet.absoluteFill} // Ensure it covers the full area
            className="z-40 bg-black/30" // Background and stacking
          />

          {/* Menu Content */}
          <View className="absolute bottom-0 left-0 top-16 z-50 w-72 bg-[#1f2937] shadow-lg">
            {/* User Profile Section */}
            <View className="border-b border-gray-700 bg-[#111827] px-6 py-8">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-xl font-semibold text-white">
                  {authState.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text className="font-poppins text-lg font-semibold text-white">
                {authState.user?.name || 'User'}
              </Text>
              <Text className="font-poppins text-sm text-gray-400">{authState.user?.email}</Text>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 py-4">
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    navigation.navigate(item.route);
                    setMenuOpen(false);
                  }}
                  className="flex-row items-center space-x-3 px-6 py-3 hover:bg-gray-800">
                  <MaterialIcons name={item.icon as any} size={22} color="#9ca3af" />
                  <Text className="font-poppins text-gray-300">{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={logout}
              className="flex-row items-center space-x-3 border-t border-gray-700 px-6 py-4 hover:bg-gray-800">
              <MaterialIcons name="logout" size={22} color="#9ca3af" />
              <Text className="font-poppins text-gray-300">Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
