import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { AppLayout } from '../components/AppLayout';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketList } from '../components/TicketList';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

type AuthContextType = {
  authState: {
    token: string | null;
    authenticated: boolean;
    loading: boolean;
    error: string | null;
    user: {
      name?: string;
      email?: string;
      role?: 'admin' | 'user';
    } | null;
  };
};

const INITIAL_STATS = {
  total: 0,
  open: 0,
  pending_customer: 0,
  pending_tht: 0,
  closed: 0,
  high_priority: 0,
  unassigned: 0,
  assigned_to_me: 0,
};

export default function HomeScreen() {
  const { authState } = useAuth() as AuthContextType;
  const isAdmin = authState.user?.role === 'admin';

  const [ticketStats, setTicketStats] = React.useState(INITIAL_STATS);
  const [showNetworkError, setShowNetworkError] = React.useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'open' | 'closed'>('open');
  const [isCreateModalVisible, setCreateModalVisible] = React.useState(false);

  const checkConnectionAndFetchStats = React.useCallback(async () => {
    try {
      setIsCheckingConnection(true);
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        setShowNetworkError(true);
        return;
      }

      const response = await apiFetch('/tickets/stats', { token: authState.token });
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setTicketStats(data);
      setShowNetworkError(false);
    } catch (err) {
      console.error('Error fetching stats:', err instanceof Error ? err.message : err);
      setShowNetworkError(true);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [authState.token]);

  // Admin-only: fetch stats on mount and re-fetch when connectivity is restored.
  const wasConnectedRef = React.useRef(true);
  React.useEffect(() => {
    if (!isAdmin) return;

    checkConnectionAndFetchStats();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && !wasConnectedRef.current) {
        checkConnectionAndFetchStats();
      }
      wasConnectedRef.current = isConnected;
    });

    return () => unsubscribe();
  }, [isAdmin, checkConnectionAndFetchStats]);

  return (
    <AppLayout
      title="Support Tickets"
      headerRight={
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={{ padding: 8 }}>
          <MaterialIcons name="add" size={28} color="#e5e7eb" />
        </TouchableOpacity>
      }>
      <Modal visible={showNetworkError} transparent animationType="fade" onRequestClose={() => {}}>
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="w-4/5 items-center rounded-lg bg-gray-800 p-6">
            <Text className="mb-4 text-center font-poppins text-lg text-white">
              No Internet Connection
            </Text>
            <Text className="mb-6 text-center font-poppins text-gray-300">
              Please check your internet connection and wait for reconnection
            </Text>
            {isCheckingConnection ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              <TouchableOpacity
                onPress={checkConnectionAndFetchStats}
                className="rounded bg-blue-600 px-4 py-2">
                <Text className="font-poppins text-white">Retry Connection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {isAdmin && (
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            {[
              { title: 'Open Tickets', value: ticketStats.open },
              { title: 'High Priority', value: ticketStats.high_priority },
              { title: 'Unassigned', value: ticketStats.unassigned },
            ].map((item) => (
              <View key={item.title} style={styles.statItem}>
                <Text style={styles.statValue}>{item.value ?? '0'}</Text>
                <Text style={styles.statTitle}>{item.title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="flex-1">
        {/* Tabs */}
        <View className="border-b border-gray-700">
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setActiveTab('open')}
              className={`px-6 py-3 ${activeTab === 'open' ? 'border-b-2 border-blue-500' : ''}`}>
              <Text
                className={`font-poppins ${activeTab === 'open' ? 'text-blue-500' : 'text-gray-400'}`}>
                Open Tickets
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('closed')}
              className={`px-6 py-3 ${activeTab === 'closed' ? 'border-b-2 border-blue-500' : ''}`}>
              <Text
                className={`font-poppins ${activeTab === 'closed' ? 'text-blue-500' : 'text-gray-400'}`}>
                Closed Tickets
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ticket List */}
        <View className="flex-1 pt-4">
          <TicketList
            status={activeTab === 'open' ? 'new,pending_tht,pending_customer' : 'closed'}
          />
        </View>

        <CreateTicketModal
          visible={isCreateModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onTicketCreated={() => {
            if (isAdmin) checkConnectionAndFetchStats();
          }}
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    backgroundColor: '#4a5568',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    flex: 1,
  },
  statTitle: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  statValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
});
