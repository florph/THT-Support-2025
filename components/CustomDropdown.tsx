import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';

type DropdownItem = {
  label: string;
  value: string;
};

type CustomDropdownProps = {
  items: DropdownItem[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  placeholderTextColor?: string;
  textColor?: string;
};

const CustomDropdown = ({
  items,
  selectedValue,
  onValueChange,
  placeholder,
  disabled = false,
  placeholderTextColor = '#9CA3AF',
  textColor = '#F9FAFB',
}: CustomDropdownProps) => {
  const [visible, setVisible] = useState(false);

  const selectedItem = items.find((item) => item.value === selectedValue);
  const displayText = selectedItem ? selectedItem.label : placeholder;
  const displayColor = selectedItem ? textColor : placeholderTextColor;

  const toggleDropdown = () => {
    if (!disabled) {
      setVisible(!visible);
    }
  };

  const renderItem = ({ item }: { item: DropdownItem }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
        onValueChange(item.value);
        setVisible(false);
      }}>
      <Text style={[styles.itemText, item.value === selectedValue && styles.selectedItemText]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={toggleDropdown}
        disabled={disabled}>
        <Text style={[styles.buttonText, { color: displayColor }]}>{displayText}</Text>
        <Text style={styles.icon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}>
          <View style={styles.dropdown}>
            <FlatList data={items} renderItem={renderItem} keyExtractor={(item) => item.value} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 15,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  icon: {
    fontSize: 14,
    color: '#F9FAFB',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  dropdown: {
    maxHeight: 300,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  itemText: {
    fontSize: 16,
    color: '#F9FAFB',
    fontFamily: 'Poppins-Regular',
  },
  selectedItemText: {
    color: '#3B82F6',
    fontFamily: 'Poppins-Medium',
  },
});

export default CustomDropdown;
