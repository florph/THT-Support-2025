import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import CustomDropdown from './CustomDropdown';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

// Define AuthContextType mirroring App.tsx or import if shared
type User = {
  name?: string;
  email?: string;
  role?: string; // Add role to User type
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

// Types for the fetched options
type OptionItem = {
  id?: number;
  name?: string;
  value?: string;
  label?: string;
  subcategories?: OptionItem[]; // Allow nested subcategories for categories
};

type TicketOptions = {
  categories?: OptionItem[];
  priorities?: OptionItem[]; // Use the same OptionItem type for consistency
  support_staff?: OptionItem[]; // Use the same OptionItem type for consistency
  statuses?: OptionItem[]; // Include statuses for completeness
};

type CreateTicketModalProps = {
  visible: boolean;
  onClose: () => void;
  // Called after a ticket is successfully created (e.g. to refresh stats/list).
  onTicketCreated?: () => void;
};

export function CreateTicketModal({ visible, onClose, onTicketCreated }: CreateTicketModalProps) {
  const { authState } = useAuth() as AuthContextType; // Explicitly type the context hook result
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(''); // Use empty string instead of null
  const [subCategory, setSubCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [assignedUserId, setAssignedUserId] = useState<string>(''); // State for assigned user ID
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketOptions, setTicketOptions] = useState<TicketOptions>({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Filter subcategories based on selected category (restored from previous version)
  const availableSubcategories = React.useMemo(() => {
    if (!category || !ticketOptions.categories) {
      return [];
    }
    // Find the selected category object
    const selectedCategoryObject = ticketOptions.categories.find(
      (cat) => cat.id?.toString() === category || cat.value === category // Support both id and value formats
    );
    // Return its nested subcategories, or empty array if not found
    return selectedCategoryObject?.subcategories || [];
  }, [category, ticketOptions.categories]);

  // Fetch options when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Reset form fields when modal opens
      setTitle('');
      setDescription('');
      setCategory('');
      setSubCategory('');
      setPriority('');
      setAssignedUserId(''); // Reset assigned user when modal opens
      setOptionsError(null);
      setIsSubmitting(false);

      const fetchOptions = async () => {
        if (!authState?.token) {
          setOptionsError('Authentication token is missing.');
          return;
        }

        setOptionsLoading(true);
        setOptionsError(null);
        try {
          const response = await apiFetch('/ticket-options', { token: authState.token });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch ticket options');
          }
          const data = await response.json();
          setTicketOptions(data);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'An unknown error occurred';
          setOptionsError(message);
          showMessage({
            message: 'Error Loading Options',
            description: message,
            type: 'danger',
          });
          console.error('Error fetching ticket options:', err);
        } finally {
          setOptionsLoading(false);
        }
      };

      fetchOptions();
    }
  }, [visible, authState?.token]);

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form fields on close if not submitting
      setTitle('');
      setDescription('');
      setCategory('');
      setSubCategory('');
      setPriority('');
      setAssignedUserId(''); // Reset assigned user on close
      setTicketOptions({}); // Clear fetched options too
      setOptionsError(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setOptionsError(null); // Clear previous errors

    // Basic validation
    if (!title.trim()) {
      showMessage({ message: 'Title is required.', type: 'warning' });
      setIsSubmitting(false);
      return;
    }
    if (!category) {
      showMessage({ message: 'Category is required.', type: 'warning' });
      setIsSubmitting(false);
      return;
    }
    if (!priority) {
      showMessage({ message: 'Priority is required.', type: 'warning' });
      setIsSubmitting(false);
      return;
    }
    if (!description.trim()) {
      showMessage({ message: 'Description is required.', type: 'warning' });
      setIsSubmitting(false);
      return;
    }

    // Normalize empty selections to null and ids to integers so the API
    // doesn't receive empty strings for nullable integer columns.
    const payload = {
      title: title.trim(),
      description: description.trim(),
      ticket_category_id: category ? parseInt(category, 10) : null,
      ticket_subcategory_id: subCategory ? parseInt(subCategory, 10) : null,
      priority,
      assigned_to_user_id: assignedUserId ? parseInt(assignedUserId, 10) : null,
      // status: 'new', // API likely sets this default
    };

    try {
      const response = await apiFetch('/tickets/create', {
        method: 'POST',
        token: authState.token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle API errors more gracefully
        const errorMessage = responseData.message || `API Error: ${response.status}`;
        let errorDetails = '';
        if (responseData.errors) {
          errorDetails = Object.values(responseData.errors).flat().join(' ');
        }
        throw new Error(`${errorMessage} ${errorDetails}`.trim());
      }

      showMessage({
        message: 'Ticket Created Successfully',
        type: 'success',
      });
      handleClose(); // Close modal on success
      onTicketCreated?.(); // Let the parent refresh stats/list
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showMessage({
        message: 'Failed to Create Ticket',
        description: message,
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Create New Support Ticket</Text>

            {optionsLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
            ) : optionsError ? (
              <Text style={styles.errorText}>Error loading options: {optionsError}</Text>
            ) : (
              <ScrollView style={styles.scrollView}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter ticket title"
                  placeholderTextColor="#6b7280" // Lighter placeholder text
                  value={title}
                  onChangeText={setTitle}
                  editable={!isSubmitting}
                />

                <Text style={styles.label}>Category</Text>
                <CustomDropdown
                  items={[
                    { label: 'Select Category...', value: '' },
                    ...(ticketOptions.categories?.map((cat) => ({
                      label: cat.name || '',
                      value: (cat.id || '').toString(),
                    })) || []),
                  ]}
                  selectedValue={category}
                  onValueChange={(itemValue) => {
                    if (itemValue !== category) {
                      setCategory(itemValue);
                      setSubCategory(''); // Reset subcategory when category changes
                    }
                  }}
                  placeholder="Select Category..."
                  disabled={isSubmitting}
                />

                {/* Only show SubCategory if a category is selected */}
                {category && (
                  <>
                    <Text style={styles.label}>Sub-Category</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Sub-Category (Optional)...', value: '' },
                        ...availableSubcategories.map((subCat) => ({
                          label: subCat.name || '',
                          value: (subCat.id || '').toString(),
                        })),
                      ]}
                      selectedValue={subCategory}
                      onValueChange={(itemValue) => setSubCategory(itemValue)}
                      placeholder="Select Sub-Category (Optional)..."
                      disabled={isSubmitting || availableSubcategories.length === 0}
                    />
                  </>
                )}

                <Text style={styles.label}>Priority</Text>
                <CustomDropdown
                  items={[
                    { label: 'Select Priority...', value: '' },
                    ...(ticketOptions.priorities?.map((p) => ({
                      label: p.label || '',
                      value: p.value || '',
                    })) || [
                      { label: 'Low', value: 'low' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'High', value: 'high' },
                      { label: 'Urgent', value: 'urgent' },
                    ]),
                  ]}
                  selectedValue={priority}
                  onValueChange={(itemValue) => setPriority(itemValue)}
                  placeholder="Select Priority..."
                  disabled={isSubmitting}
                />

                {/* Conditionally render Assign To based on user role */}
                {authState.user?.role === 'admin' && (
                  <>
                    <Text style={styles.label}>Assign To (Optional)</Text>
                    <CustomDropdown
                      items={[
                        { label: 'Select Assignee...', value: '' },
                        ...(ticketOptions.support_staff?.map((assignee) => ({
                          label: assignee.name || '',
                          value: (assignee.id || '').toString(),
                        })) || []),
                      ]}
                      selectedValue={assignedUserId}
                      onValueChange={(itemValue) => setAssignedUserId(itemValue)}
                      placeholder="Select Assignee..."
                      disabled={isSubmitting || (ticketOptions.support_staff?.length ?? 0) === 0}
                    />
                  </>
                )}

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]} // Use input style + specific textarea style
                  placeholder="Describe the issue"
                  placeholderTextColor="#6b7280"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  editable={!isSubmitting}
                />
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={handleClose}
                disabled={isSubmitting}>
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]} // Apply submit button style
                onPress={handleSubmit}
                disabled={isSubmitting || optionsLoading} // Disable if submitting or still loading options
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Ticket</Text> // Apply submit button text style
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker backdrop
  },
  modalView: {
    margin: 20,
    width: '90%',
    maxWidth: 500, // Max width for larger screens/tablets
    backgroundColor: '#1F2937', // Dark background matching theme
    borderRadius: 10,
    padding: 25,
    alignItems: 'stretch', // Stretch items to fill width
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
    color: '#F9FAFB', // Light text color
    fontFamily: 'Poppins-SemiBold', // Match app font
  },
  scrollView: {
    marginBottom: 15, // Space before buttons
    maxHeight: Platform.OS === 'ios' ? 600 : 550, // Increased height
  },
  label: {
    fontSize: 14,
    color: '#D1D5DB', // Lighter gray for labels
    marginBottom: 8,
    fontFamily: 'Poppins-Medium',
  },
  input: {
    backgroundColor: '#374151', // Darker input background
    color: '#F9FAFB', // Light text
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4B5563', // Subtle border
    fontFamily: 'Poppins-Regular',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top', // Align text to the top in multiline
  },
  pickerContainer: {
    backgroundColor: '#374151', // Match input background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563', // Match input border
    marginBottom: 15,
    justifyContent: 'center', // Center picker item vertically
    overflow: 'hidden', // Ensure dropdown doesn't overflow container
  },
  picker: {
    color: '#F9FAFB', // Light text color for selected item
    height: 50, // Standard height
    width: '100%', // Ensure picker takes full width
    // Note: Styling individual Picker.Item is limited, especially on Android.
    // Color prop on Picker.Item is the primary way to style dropdown items.
    ...Platform.select({
      ios: {
        // Additional iOS specific styles if needed
      },
      android: {
        // Android uses a native dropdown, styling is limited
        // The `backgroundColor` is applied by the container
      },
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Align buttons to the right
    marginTop: 10, // Add some space above buttons
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    marginLeft: 10, // Space between buttons
    minWidth: 100, // Minimum button width
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonClose: {
    backgroundColor: '#4B5563', // Grey background for cancel
  },
  submitButton: {
    backgroundColor: '#3B82F6', // Primary blue for submit
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textStyle: {
    color: '#F9FAFB',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  submitButtonText: {
    color: '#ffffff', // White text for primary button
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  errorText: {
    color: '#F87171', // Red color for errors
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },
});
