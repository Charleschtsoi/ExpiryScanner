import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { addInventoryItem } from '../services/inventory';

interface ManualEntryScreenProps {
  onBack: () => void;
  initialBarcode?: string; // Optional: pre-fill if coming from scan failure
  onViewInventory?: () => void; // Optional: callback to view inventory
}

export default function ManualEntryScreen({ onBack, initialBarcode, onViewInventory }: ManualEntryScreenProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill barcode if provided
  useEffect(() => {
    if (initialBarcode) {
      setBarcode(initialBarcode);
    }
  }, [initialBarcode]);

  const handleSubmit = async () => {
    // Validation
    if (!productName.trim() || !expiryDate.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter at least the product name and expiry date.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Calculate days left from expiry date
    let savedName, savedCategory, savedExpiryDate, daysLeft, status;
    try {
      const expiryDateObj = new Date(expiryDate);
      const now = new Date();
      const diffTime = expiryDateObj.getTime() - now.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        status = 'EXPIRED';
      } else if (daysLeft === 0) {
        status = 'EXPIRES TODAY';
      } else if (daysLeft === 1) {
        status = 'Expires tomorrow';
      } else {
        status = `Expires in ${daysLeft} days`;
      }

      // Store values before clearing
      savedName = productName.trim();
      savedCategory = category.trim() || 'General';
      savedExpiryDate = expiryDate;
    } catch (error) {
      Alert.alert(
        'Invalid Date',
        'Please enter a valid expiry date (YYYY-MM-DD format).',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show loading state
    setSaving(true);

    try {
      // Automatically save to inventory
      await addInventoryItem({
        barcode: barcode.trim() || 'Manual Entry',
        product_name: savedName,
        category: savedCategory,
        expiry_date: savedExpiryDate,
        ai_confidence: 1.0, // 100% confidence for manual entry
      });

      console.log('✅ Manual product entry saved to inventory:', {
        name: savedName,
        category: savedCategory,
        expiryDate: savedExpiryDate,
        daysLeft,
      });

      // Clear form
      setProductName('');
      setCategory('');
      setBarcode(initialBarcode || '');
      setExpiryDate('');

      // Show success message with options
      Alert.alert(
        'Success',
        'Product saved to inventory!',
        [
          {
            text: 'Add Another',
            onPress: () => {
              // Keep form open for another entry
              setSaving(false);
            },
          },
          {
            text: 'View Inventory',
            onPress: () => {
              // Navigate back and show inventory if callback provided
              onBack();
              if (onViewInventory) {
                // Small delay to ensure navigation completes
                setTimeout(() => {
                  onViewInventory();
                }, 100);
              }
            },
          },
          {
            text: 'Done',
            onPress: () => {
              onBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving manual entry to inventory:', error);
      
      // Show error but keep form open for retry
      Alert.alert(
        'Error',
        'Failed to save product to inventory. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setSaving(false);
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              onBack();
            },
          },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Entry</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Enter product details manually. All fields marked with * are required.
        </Text>

        {/* Product Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g., Frozen Chicken, Organic Milk"
            placeholderTextColor="#9CA3AF"
            autoFocus={!initialBarcode}
            editable={!saving}
          />
        </View>

        {/* Category Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Category (Optional)</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., Meat, Dairy, Produce"
            placeholderTextColor="#9CA3AF"
            editable={!saving}
          />
        </View>

        {/* Batch Code/Barcode Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Batch Code / Barcode (Optional)</Text>
          <TextInput
            style={styles.input}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Enter batch code or barcode"
            placeholderTextColor="#9CA3AF"
            editable={!saving}
          />
        </View>

        {/* Expiry Date Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Expiry Date *</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="YYYY-MM-DD (e.g., 2024-12-31)"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            editable={!saving}
          />
          <Text style={styles.inputHint}>
            Enter the expiry date in YYYY-MM-DD format
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save to Inventory</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSpacer: {
    width: 60, // Same width as back button for centering
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
