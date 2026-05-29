import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';

import { getStatusMeta, getPriorityMeta } from '../constants/tickets';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AuthContextType = {
  authState: {
    user: {
      role?: string;
    } | null;
    token: string | null;
  };
};

type Ticket = {
  id: number;
  uuid: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_to: string | null;
  category: string;
  subcategory: string;
  source: string;
  creator_name?: string;
  creator_email?: string;
};

type TicketListProps = {
  status: string;
};

type TicketListItemProps = {
  item: Ticket;
  navigation: NavigationProp;
  isSmallScreen: boolean;
};

const TicketListItem: React.FC<TicketListItemProps> = ({ item, navigation, isSmallScreen }) => {
  const statusMeta = getStatusMeta(item.status);
  const priorityMeta = getPriorityMeta(item.priority);
  return (
    <TouchableOpacity
      className="mx-0 mb-3 rounded-lg bg-gray-800 p-3"
      onPress={() =>
        navigation.navigate('TicketDetail', { ticketId: item.uuid ?? String(item.id) })
      }>
      <View className="flex-col">
        {/* Row 1: Title / Assigned To */}
        <View className="mb-3 flex-row items-start justify-between">
          <View className="mr-2 flex-1">
            <Text className="font-poppins font-medium text-white">
              #{String(item.uuid ? item.uuid.substring(0, 8) : item.id)} -
              {String(item.title.length > 35 ? `${item.title.substring(0, 30)}...` : item.title)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="flex-shrink-1 rounded px-2 py-1.5"
              style={{
                backgroundColor: item.assigned_to
                  ? 'rgba(20, 184, 166, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              }}>
              <Text
                className={`font-poppins text-[9px] ${item.assigned_to ? 'text-teal-400' : 'text-red-400'}`}>
                {String(item.assigned_to ? `Assigned To: ${item.assigned_to}` : 'Unassigned')}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2: Badges - Conditional direction/alignment */}
        <View
          className="mb-3 flex"
          style={
            isSmallScreen
              ? { flexDirection: 'column', alignItems: 'flex-start', rowGap: 8 }
              : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
          }>
          {/* Left Badges (Category/Sub) */}
          <View className="flex-row flex-wrap items-center gap-2">
            {item.category ? (
              <View className="rounded bg-purple-500/20 px-2 py-1.5">
                <Text className="font-poppins text-[9px] text-purple-400">
                  {String(item.category).toUpperCase()}
                </Text>
              </View>
            ) : null}
            {item.subcategory ? (
              <View className="rounded bg-indigo-500/20 px-2 py-1.5">
                <Text className="font-poppins text-[9px] text-indigo-400">
                  {String(item.subcategory).toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          {/* Right Badges (Status/Priority) */}
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded px-2 py-1.5" style={{ backgroundColor: statusMeta.bgColor }}>
              <Text className="font-poppins text-[9px]" style={{ color: statusMeta.textColor }}>
                {String(item.status).toUpperCase()}
              </Text>
            </View>
            <View className="rounded px-2 py-1.5" style={{ backgroundColor: priorityMeta.bgColor }}>
              <Text className="font-poppins text-[9px]" style={{ color: priorityMeta.textColor }}>
                {String(item.priority).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 3: Submitted By / Date - Use flex layout */}
        <View className="flex-row items-center justify-between">
          {/* Submitted By - Use flex-1 to allow wrapping */}
          <View className="mr-2 flex-1">
            <Text
              className="font-poppins text-xs text-gray-400"
              numberOfLines={1}
              ellipsizeMode="tail">
              By {String(item.creator_name || item.creator_email || 'Unknown')}
            </Text>
          </View>
          {/* Date */}
          <Text className="font-poppins text-xs text-gray-400">
            {String(new Date(item.created_at).toLocaleDateString())}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export function TicketList({ status }: TicketListProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  const navigation = useNavigation<NavigationProp>();
  const { authState } = useAuth() as AuthContextType;
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchTickets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path =
        authState.user?.role === 'admin'
          ? `/tickets?status=${status}`
          : `/tickets/my-tickets?status=${status}`;

      const response = await apiFetch(path, { token: authState.token });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API returned ${response.status}: ${text}`);
      }

      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authState.token, authState.user?.role, status]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="mb-4 font-poppins text-red-500">{error}</Text>
        <TouchableOpacity onPress={fetchTickets} className="rounded bg-blue-600 px-4 py-2">
          <Text className="font-poppins text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tickets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="font-poppins text-gray-400">No tickets found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tickets}
      keyExtractor={(item) => item.uuid ?? String(item.id)}
      renderItem={({ item }) => (
        <TicketListItem item={item} navigation={navigation} isSmallScreen={isSmallScreen} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6" // Blue to match app theme
          colors={['#3b82f6']}
        />
      }
      contentContainerStyle={{ paddingBottom: 20 }}
      className="flex-1" // Ensure FlatList takes available space
    />
  );
}
