import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { AppLayout } from '../components/AppLayout';
import CustomDropdown from '../components/CustomDropdown';
import { getStatusMeta, getPriorityMeta } from '../constants/tickets';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

// Assuming Ticket, Attachment, Comment types are defined correctly elsewhere or adjust as needed
type User = {
  id: number;
  name: string;
  email: string;
  role?: string; // Add role to User type
};

type Comment = {
  id: number;
  content: string;
  created_at: string;
  user: string | null;
  attachments: Attachment[];
};

type Attachment = {
  id: number;
  support_ticket_id?: number | null;
  ticket_comment_id?: number | null;
  file_name: string;
  original_name?: string;
  file_path: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string;
  created_at?: string;
  updated_at?: string;
};

type Ticket = {
  id: number;
  uuid: string;
  title: string;
  subject?: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  ticket_category_id: number | string | null;
  ticket_subcategory_id: number | string | null;
  ticket_category: {
    id: number;
    name: string;
  } | null;
  ticket_subcategory: {
    id: number;
    name: string;
  } | null;
  source: string | null;
  creator_name: string | null;
  creator_email: string | null;
  comments: Comment[];
  attachments: Attachment[];
  assigned_to_user_id?: number | null;
  assignedUser?: { id: number; name: string };
  user: { id: number; name: string; email: string } | string | null;
};

// Updated interface to use string for IDs and empty string for null equivalent
interface EditTicketFormState {
  categoryId: string; // ID as string
  subCategoryId: string; // ID as string
  assignedUserId: string; // ID as string
  priority: string; // Already string, use "" for null
  status: string; // Already string, use "" for null
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
};

function TicketDetailScreen({ route, navigation }: any) {
  const { ticketId } = route.params;
  const { authState } = useAuth() as any;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for new comment
  const [newComment, setNewComment] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<ImagePicker.ImagePickerAsset[]>(
    []
  );
  const [isSending, setIsSending] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  // Initialize state with empty strings instead of null
  const [editedTicketData, setEditedTicketData] = useState<EditTicketFormState>({
    categoryId: '',
    subCategoryId: '',
    assignedUserId: '',
    priority: '',
    status: '',
  });
  const [isSaving, setIsSaving] = useState(false); // State for save loading

  // State for dropdown options
  const [ticketOptions, setTicketOptions] = useState<any>(null); // Store categories, users, statuses etc.
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const fetchTicketDetails = React.useCallback(
    async (isRefreshing = false) => {
      try {
        if (!isRefreshing) {
          setLoading(true);
        }
        const response = await apiFetch(`/tickets/${ticketId}`, { token: authState.token });

        if (!response.ok) {
          throw new Error('Failed to fetch ticket details');
        }

        const data = await response.json();
        setTicket(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!isRefreshing) {
          setLoading(false);
        }
      }
    },
    [ticketId, authState.token]
  );

  // Fetch options for dropdowns
  const fetchTicketOptions = React.useCallback(async () => {
    try {
      setOptionsLoading(true);
      const response = await apiFetch('/ticket-options', { token: authState.token });
      if (!response.ok) {
        throw new Error('Failed to fetch ticket options');
      }
      const data = await response.json();
      setTicketOptions(data);
      setOptionsError(null);
    } catch (err) {
      setOptionsError(err instanceof Error ? err.message : 'An error occurred fetching options');
      console.error('Error fetching ticket options:', err);
    } finally {
      setOptionsLoading(false);
    }
  }, [authState.token]);

  // Permission requests for camera and media library
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and media library permissions are needed to add attachments.'
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], // Allow images and videos
      allowsMultipleSelection: true,
      quality: 0.8, // Adjust quality as needed
    });

    if (!result.canceled && result.assets) {
      const assets = result.assets;
      setSelectedAttachments((prev) => [...prev, ...assets]);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false, // Usually false for direct camera capture
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedAttachments((prev) => [...prev, asset]);
    }
  };

  const handleRecordVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'], // Explicitly ask for video
      allowsEditing: true, // Allow trimming etc. on some platforms
      quality: 0.8, // Video quality (0 -> low, 1 -> high)
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedAttachments((prev) => [...prev, asset]);
    }
  };

  const handleRemoveAttachment = (uri: string) => {
    setSelectedAttachments((prev) => prev.filter((att) => att.uri !== uri));
  };

  const handleSendComment = async () => {
    if (!newComment.trim() && selectedAttachments.length === 0) {
      showMessage({
        message: 'Empty Comment',
        description: 'Please enter a comment or add an attachment.',
        type: 'warning',
        icon: 'warning',
      });
      return;
    }
    if (!ticket?.uuid) {
      showMessage({
        message: 'Error',
        description: 'Cannot send comment: Ticket ID is missing.',
        type: 'danger',
        icon: 'danger',
      });
      return;
    }
    setIsSending(true);

    const formData = new FormData();
    formData.append('comment', newComment.trim()); // Send trimmed comment

    // Append attachments, ensuring correct naming for backend (e.g., attachments[])
    selectedAttachments.forEach((attachment, index) => {
      const uri =
        Platform.OS === 'android' ? attachment.uri : attachment.uri.replace('file://', '');
      const filename =
        attachment.fileName || `attachment_${Date.now()}_${index}.${uri.split('.').pop()}`;
      const type = attachment.mimeType || 'application/octet-stream'; // Default MIME type

      // Append each file using an array notation key if backend expects an array
      // Or use indexed keys like attachments[0], attachments[1] if needed
      formData.append('attachments[]', {
        // Adjust 'attachments[]' if your API expects a different key format
        uri,
        name: filename,
        type,
      } as any); // Type assertion needed for fetch
    });

    try {
      // Content-Type is intentionally omitted so fetch sets the multipart boundary.
      const response = await apiFetch(`/tickets/${ticket?.uuid}/comments`, {
        method: 'POST',
        token: authState.token,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Try to parse JSON error if possible
        let errorMessage = `Failed to send comment. Status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          /* Ignore parsing error */
        }
        throw new Error(errorMessage);
      }

      // Success:
      setNewComment('');
      setSelectedAttachments([]);
      fetchTicketDetails(true); // Refresh ticket details to show the new comment
      showMessage({ message: 'Comment added successfully!', type: 'success', icon: 'success' });
    } catch (error: any) {
      console.error('Send comment fetch error:', error);
      showMessage({
        message: 'Error sending comment',
        description: error.message || 'An unexpected error occurred. Please try again.',
        type: 'danger',
        icon: 'danger',
      });
    } finally {
      setIsSending(false); // Ensure button is re-enabled
    }
  };

  const handleSaveEdit = async () => {
    if (!ticket?.uuid || isSaving || !ticketOptions) return;

    setIsSaving(true);
    try {
      // Convert empty selections to null and id strings to integers so the API
      // doesn't receive empty strings for nullable integer columns.
      const toIdOrNull = (value: string) => (value ? parseInt(value, 10) : null);
      const payload = {
        ticket_category_id: toIdOrNull(editedTicketData.categoryId),
        ticket_subcategory_id: toIdOrNull(editedTicketData.subCategoryId),
        assigned_to_user_id: toIdOrNull(editedTicketData.assignedUserId),
        priority: editedTicketData.priority || null,
        status: editedTicketData.status || null,
      };

      const response = await apiFetch(`/tickets/${ticket.uuid}`, {
        method: 'PATCH',
        token: authState.token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Success
      showMessage({ message: 'Ticket updated successfully', type: 'success' });
      setEditModalVisible(false);
      fetchTicketDetails(true); // Refresh data
    } catch (error: any) {
      console.error('Failed to save ticket changes:', error);
      showMessage({
        message: error.message || 'Failed to update ticket. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    // Reset state to initial empty strings
    setEditedTicketData({
      categoryId: '',
      subCategoryId: '',
      assignedUserId: '',
      priority: '',
      status: '',
    });
  };

  const handleEditPress = () => {
    if (!ticket || !ticketOptions) {
      showMessage({ message: 'Ticket data or options not loaded yet.', type: 'warning' });
      return;
    }

    // Extract potentially null/undefined values safely
    const categoryIdValue = ticket.ticket_category_id;
    const subCategoryIdValue = ticket.ticket_subcategory_id;
    const assignedUserIdValue = ticket.assigned_to_user_id;
    const priorityValue = ticket.priority;
    const statusValue = ticket.status;

    // Set initial state for the modal, converting IDs to strings and using "" for null/undefined
    const initialState: EditTicketFormState = {
      categoryId: typeof categoryIdValue === 'number' ? categoryIdValue.toString() : '', // Convert number to string or use ""
      subCategoryId: typeof subCategoryIdValue === 'number' ? subCategoryIdValue.toString() : '', // Convert number to string or use ""
      assignedUserId: typeof assignedUserIdValue === 'number' ? assignedUserIdValue.toString() : '', // Convert number to string or use ""
      priority: typeof priorityValue === 'string' ? priorityValue : '', // Use string or ""
      status: typeof statusValue === 'string' ? statusValue : '', // Use string or ""
    };

    setEditedTicketData(initialState);
    setEditModalVisible(true);
  };

  useEffect(() => {
    fetchTicketDetails(false);
    fetchTicketOptions(); // Fetch options when component mounts
  }, [fetchTicketDetails, fetchTicketOptions]); // Added fetchTicketOptions dependency

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchTicketDetails(true), fetchTicketOptions()]).finally(() =>
      setRefreshing(false)
    );
  }, [fetchTicketDetails, fetchTicketOptions]); // Added fetchTicketOptions dependency

  const EditButton = () => (
    <TouchableOpacity
      onPress={handleEditPress}
      style={{ padding: 10 }} // Added padding for easier touch
    >
      <MaterialIcons name="edit" size={24} color="#cbd5e1" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AppLayout title="Ticket Details" showMenu={false} onBackPress={() => navigation.goBack()}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Ticket Details" showMenu={false} onBackPress={() => navigation.goBack()}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center font-poppins text-red-500">{error}</Text>
        </View>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Ticket Details" showMenu={false} onBackPress={() => navigation.goBack()}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center font-poppins text-gray-500">Ticket not found</Text>
        </View>
      </AppLayout>
    );
  }

  const CommentInputSection = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // Adjust as needed
      style={{ backgroundColor: '#1f2937' }} // Match footer/header color
    >
      <View className="border-t border-gray-700 p-3">
        {/* Selected Attachments Preview */}
        {selectedAttachments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {selectedAttachments.map((attachment) => (
              <View key={attachment.uri} className="relative mr-2">
                <Image source={{ uri: attachment.uri }} className="h-16 w-16 rounded" />
                <TouchableOpacity
                  onPress={() => handleRemoveAttachment(attachment.uri)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5">
                  <MaterialIcons name="close" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input and Buttons Row */}
        <View className="flex-row items-end space-x-1">
          <TouchableOpacity onPress={handlePickImage} className="mb-1 p-2">
            <MaterialIcons name="photo-library" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Record Video Button */}
          <TouchableOpacity onPress={handleRecordVideo} className="mb-1 p-2">
            <MaterialIcons name="videocam" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTakePhoto} className="mb-1 p-2">
            <MaterialIcons name="photo-camera" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TextInput
            className="max-h-[100px] min-h-[40px] flex-1 rounded-2xl bg-gray-700 px-4 py-2 font-poppins text-base text-white"
            placeholder="Add a comment..."
            placeholderTextColor="#6b7280"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={isSending || (!newComment.trim() && selectedAttachments.length === 0)}
            className={`rounded-full p-2 ${isSending || (!newComment.trim() && selectedAttachments.length === 0) ? 'bg-gray-600' : 'bg-blue-600'}`}>
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <AppLayout
      title={ticket.title}
      showMenu={false}
      onBackPress={() => navigation.goBack()}
      headerRight={<EditButton />}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#60a5fa"
              colors={['#60a5fa']}
            />
          }>
          <View className="p-4">
            <View className="mb-4 rounded-lg bg-gray-800 p-4">
              <Text className="mb-2 font-poppins text-gray-400">
                #{ticket.uuid.substring(0, 8)}
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                <View
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: getStatusMeta(ticket.status).bgColor }}>
                  <Text
                    className="font-poppins text-xs"
                    style={{ color: getStatusMeta(ticket.status).textColor }}>
                    {ticket.status.toUpperCase()}
                  </Text>
                </View>
                <View
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: getPriorityMeta(ticket.priority).bgColor }}>
                  <Text
                    className="font-poppins text-xs"
                    style={{ color: getPriorityMeta(ticket.priority).textColor }}>
                    {ticket.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text className="mb-2 font-poppins text-gray-400">
                Created: {new Date(ticket.created_at).toLocaleString()}
              </Text>
              {ticket.assigned_to && (
                <Text className="mb-2 font-poppins text-teal-400">
                  Assigned to: {ticket.assigned_to}
                </Text>
              )}
              {/* Moved Additional Details Here */}
              <View className="mt-4 space-y-2 border-t border-gray-700 pt-4">
                <View className="flex-row justify-between">
                  <Text className="font-poppins text-gray-400">Category:</Text>
                  <Text className="font-poppins text-purple-400">
                    {ticket.ticket_category?.name || 'N/A'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-poppins text-gray-400">Subcategory:</Text>
                  <Text className="font-poppins text-indigo-400">
                    {ticket.ticket_subcategory?.name || 'N/A'}
                  </Text>
                </View>
                {ticket.creator_name && (
                  <View className="flex-row justify-between">
                    <Text className="font-poppins text-gray-400">Created by:</Text>
                    <Text className="font-poppins text-white">{ticket.creator_name}</Text>
                  </View>
                )}
                {ticket.creator_email && (
                  <View className="flex-row justify-between">
                    <Text className="font-poppins text-gray-400">Creator email:</Text>
                    <TouchableOpacity
                      onPress={() =>
                        ticket.creator_email && Linking.openURL(`mailto:${ticket.creator_email}`)
                      }
                      disabled={!ticket.creator_email}>
                      <Text className="font-poppins text-blue-400 underline">
                        {ticket.creator_email}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            <View className="mb-4 rounded-lg bg-gray-800 p-4">
              <Text className="mb-2 font-poppins font-medium text-white">Description</Text>
              <Text className="font-poppins text-gray-300">{ticket.description}</Text>
            </View>

            {/* Attachments Section */}
            <View className="rounded-lg bg-gray-800 p-4">
              <Text className="mb-4 font-poppins font-medium text-white">
                Attachments (
                {ticket.attachments?.filter(
                  (a) => a.support_ticket_id === ticket.id && !a.ticket_comment_id
                ).length || 0}
                )
              </Text>
              {ticket.attachments?.some(
                (a) => a.support_ticket_id === ticket.id && !a.ticket_comment_id
              ) ? (
                <View className="space-y-3">
                  {ticket.attachments
                    ?.filter((a) => a.support_ticket_id === ticket.id && !a.ticket_comment_id)
                    .map((attachment) => (
                      <TouchableOpacity
                        key={attachment.id}
                        className="mb-2 flex-row items-center rounded-lg border border-gray-700 bg-gray-700/50 p-3"
                        onPress={() => Linking.openURL(attachment.file_url)}>
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                          <MaterialIcons name="attach-file" size={20} color="#60a5fa" />
                        </View>
                        <View className="flex-1">
                          <Text className="mb-1 font-poppins text-white" numberOfLines={1}>
                            {attachment.file_name}
                          </Text>
                          <Text className="font-poppins text-xs text-gray-400">
                            Added{' '}
                            {attachment.created_at
                              ? new Date(attachment.created_at).toLocaleString()
                              : 'Date unknown'}{' '}
                            • {formatFileSize(attachment.file_size ?? 0)}
                          </Text>
                        </View>
                        <MaterialIcons name="download" size={20} color="#60a5fa" />
                      </TouchableOpacity>
                    ))}
                </View>
              ) : (
                <Text className="font-poppins text-gray-400">No attachments</Text>
              )}
            </View>

            {/* Comments Section */}
            <View className="mt-4 rounded-lg bg-gray-800 p-4">
              <Text className="mb-4 font-poppins font-medium text-white">
                Comments ({ticket.comments?.length || 0})
              </Text>
              {ticket.comments?.length > 0 ? (
                <View className="space-y-6">
                  {[...ticket.comments]
                    .sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ) // Sort comments by date ascending (copy to avoid mutating state)
                    .map((comment, index) => (
                      <View key={comment.id} className={index > 0 ? 'mt-6' : ''}>
                        <View className="rounded-lg border border-gray-700 bg-gray-700/50 p-4">
                          <Text className="mb-2 font-poppins text-sm text-gray-400">
                            {(comment.user as any)?.name || comment.user || 'System'} •{' '}
                            {new Date(comment.created_at).toLocaleString()}
                          </Text>
                          <Text className="mb-4 font-poppins leading-relaxed text-white">
                            {comment.content}
                          </Text>
                          {comment.attachments?.length > 0 && (
                            <View className="space-y-2">
                              {comment.attachments.map((attachment) => (
                                <TouchableOpacity
                                  key={attachment.id}
                                  className="mb-2 flex-row items-center rounded-lg border border-gray-600 bg-gray-600/50 p-2"
                                  onPress={() => Linking.openURL(attachment.file_url)}>
                                  <View className="mr-2 h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                                    <MaterialIcons name="attach-file" size={16} color="#60a5fa" />
                                  </View>
                                  <View className="flex-1">
                                    <Text
                                      className="mb-0.5 font-poppins text-sm text-white"
                                      numberOfLines={1}>
                                      {attachment.file_name}
                                    </Text>
                                    <Text className="font-poppins text-xs text-gray-400">
                                      {formatFileSize(attachment.file_size ?? 0)}
                                    </Text>
                                  </View>
                                  <MaterialIcons name="download" size={16} color="#60a5fa" />
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              ) : (
                <Text className="font-poppins text-gray-400">No comments yet</Text>
              )}
            </View>

            {/* Add Spacer at the end of ScrollView content if needed */}
            <View className="h-4" />
          </View>
        </ScrollView>
        {CommentInputSection()}

        {/* --- Edit Modal (Starts Here) --- */}
        <Modal
          animationType="slide"
          transparent
          visible={editModalVisible}
          onRequestClose={handleCancelEdit}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Ticket</Text>

              {/* Conditional Rendering for Options */}
              {
                optionsLoading ? (
                  <ActivityIndicator size="large" color="#9ca3af" style={{ marginVertical: 20 }} />
                ) : optionsError ? (
                  <Text style={{ color: 'red', textAlign: 'center', marginVertical: 20 }}>
                    Error loading options. Please try again.
                  </Text>
                ) : ticketOptions ? (
                  <>
                    {/* Category Dropdown */}
                    <Text style={styles.label}>Category</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Category...', value: '' },
                        ...(ticketOptions.categories?.map((cat: any) => ({
                          label: cat.name || '',
                          value: (cat.id || '').toString(),
                        })) || []),
                      ]}
                      selectedValue={editedTicketData.categoryId}
                      onValueChange={(itemValue: string) => {
                        // When category changes, update categoryId and reset subCategoryId
                        setEditedTicketData((prev) => ({
                          ...prev,
                          categoryId: itemValue,
                          subCategoryId: '', // Reset subcategory when category changes
                        }));
                      }}
                      placeholder="Select Category..."
                      disabled={isSaving}
                    />

                    {/* Subcategory Dropdown */}
                    <Text style={styles.label}>Sub-Category</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Sub-Category...', value: '' },
                        ...(ticketOptions.categories
                          ?.find((cat: any) => cat.id?.toString() === editedTicketData.categoryId)
                          ?.subcategories?.map((subCat: any) => ({
                            label: subCat.name || '',
                            value: (subCat.id || '').toString(),
                          })) || []),
                      ]}
                      selectedValue={editedTicketData.subCategoryId}
                      onValueChange={(itemValue: string) =>
                        setEditedTicketData((prev) => ({ ...prev, subCategoryId: itemValue }))
                      }
                      placeholder="Select Sub-Category..."
                      disabled={
                        isSaving ||
                        !editedTicketData.categoryId ||
                        !ticketOptions.categories?.find(
                          (cat: any) => cat.id?.toString() === editedTicketData.categoryId
                        )?.subcategories?.length
                      }
                    />

                    {/* Assigned User Dropdown - Conditionally Rendered */}
                    {authState.user?.role === 'admin' && (
                      <>
                        <Text style={styles.label}>Assigned To</Text>
                        <CustomDropdown
                          items={[
                            { label: 'Unassigned', value: '' },
                            ...(ticketOptions.support_staff?.map((user: any) => ({
                              label: user.name || '',
                              value: (user.id || '').toString(),
                            })) || []),
                          ]}
                          selectedValue={editedTicketData.assignedUserId}
                          onValueChange={(itemValue: string) =>
                            setEditedTicketData((prev) => ({ ...prev, assignedUserId: itemValue }))
                          }
                          placeholder="Unassigned"
                          disabled={isSaving}
                        />
                      </>
                    )}
                    {/* Priority Dropdown */}
                    <Text style={styles.label}>Priority</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Priority...', value: '' },
                        ...(ticketOptions.priorities?.map((priority: any) => ({
                          label: priority.label || '',
                          value: priority.value || '',
                        })) || []),
                      ]}
                      selectedValue={editedTicketData.priority}
                      onValueChange={(itemValue: string) =>
                        setEditedTicketData((prev) => ({ ...prev, priority: itemValue }))
                      }
                      placeholder="Select Priority..."
                      disabled={isSaving}
                    />

                    {/* Status Dropdown */}
                    <Text style={styles.label}>Status</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Status...', value: '' },
                        ...(ticketOptions.statuses?.map((status: any) => ({
                          label: status.label || '',
                          value: status.value || '',
                        })) || []),
                      ]}
                      selectedValue={editedTicketData.status}
                      onValueChange={(itemValue: string) =>
                        setEditedTicketData((prev) => ({ ...prev, status: itemValue }))
                      }
                      placeholder="Select Status..."
                      disabled={isSaving}
                    />
                  </>
                ) : null /* End conditional rendering for options */
              }

              {/* Modal Buttons - Always visible unless options errored? Or maybe disable save if options not loaded? */}
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                  disabled={isSaving}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </AppLayout>
  );
}

export default TicketDetailScreen;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker backdrop from CreateTicketModal
  },
  modalContent: {
    margin: 20,
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#1F2937', // Dark background from CreateTicketModal
    borderRadius: 10,
    padding: 25,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#F9FAFB',
    fontFamily: 'Poppins-SemiBold',
  },
  label: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 8,
    fontFamily: 'Poppins-Medium',
  },
  pickerContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginBottom: 15,
    justifyContent: 'center',
  },
  picker: {
    color: '#F9FAFB', // Light text color for selected item
    height: 50,
    // Platform specific adjustments might be needed depending on visual outcome
    ...Platform.select({
      ios: {},
      android: {},
    }),
  },
  pickerItem: {
    // This style primarily affects iOS. Android item color is often set via `color` prop on Picker.Item
    // We will keep setting color prop directly on Picker.Item for placeholders etc.
    color: '#000000', // Changed to black for testing visibility
    backgroundColor: '#FFFFFF', // Explicitly setting background for dropdown items (might only work on iOS)
    fontFamily: 'Poppins-Regular',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20, // Increased space from CreateTicketModal's 10
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    marginLeft: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#4B5563', // Grey background from CreateTicketModal (buttonClose)
  },
  saveButton: {
    backgroundColor: '#3B82F6', // Primary blue from CreateTicketModal (submitButton)
  },
  buttonText: {
    color: '#F9FAFB', // Consistent light text
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  disabledButton: {
    opacity: 0.5, // From CreateTicketModal (buttonDisabled)
  },
});
