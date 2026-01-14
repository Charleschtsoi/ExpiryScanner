import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput, ScrollView, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { registerForPushNotificationsAsync } from './utils/notifications';
import { analyzeProductFromBarcode, isAIAnalysisConfigured, AIAnalysisError } from './services/aiAnalysis';
import { addInventoryItem } from './services/inventory';
import InventoryScreen from './screens/InventoryScreen';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false); // Controls if camera is active
  const [scanned, setScanned] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Manual entry state (when AI fails)
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [failedBarcode, setFailedBarcode] = useState(null); // Store the barcode that failed
  const [manualProductImage, setManualProductImage] = useState<string | null>(null); // Product image URI
  const [manualBatchCode, setManualBatchCode] = useState(''); // Batch code input
  const [manualExpiryDate, setManualExpiryDate] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState(''); // Store the AI error message
  const [showInventory, setShowInventory] = useState(false); // Control inventory screen visibility
  const [savingToInventory, setSavingToInventory] = useState(false); // Track save operation

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('Push notification token registered:', token);
      }
    }).catch(error => {
      console.error('Error registering for push notifications:', error);
    });

    // Check if AI analysis is configured (non-blocking)
    if (!isAIAnalysisConfigured()) {
      console.warn(
        '⚠️ AI Analysis is not configured.\n' +
        'To enable AI features:\n' +
        '1. Create a .env file in the project root\n' +
        '2. Add: EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
        '3. Add: EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n' +
        '4. Restart Expo dev server\n' +
        '\n' +
        'The app will work without AI, but scanning features will be limited.'
      );
    }
  }, []);

  // 3. RESET SCANNER
  const closeResult = () => {
    setScanned(false);
    setScannedProduct(null);
    setIsScanning(false); // Return to home screen
  };

  // Start scanning - called when user clicks "Scan" button
  const startScanning = () => {
    if (!permission) {
      return; // Wait for permission
    }

    if (!permission.granted) {
      requestPermission();
      return;
    }

    // Reset states and start scanning
    setScanned(false);
    setScannedProduct(null);
    setIsAnalyzing(false);
    setIsScanning(true);
  };

  // Stop scanning and return to home
  const stopScanning = () => {
    setIsScanning(false);
    setScanned(false);
    setScannedProduct(null);
    setIsAnalyzing(false);
  };

  // 1. HANDLE PERMISSIONS - Show permission request screen
  if (!permission) {
    // Camera is loading
    return (
      <View style={styles.container}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingScreenText}>Checking permissions...</Text>
        </View>
      </View>
    );
  }

  // Show inventory screen if requested
  if (showInventory) {
    return <InventoryScreen onBack={() => setShowInventory(false)} />;
  }

  // Show home screen if not scanning
  if (!isScanning) {
    return (
      <View style={styles.homeContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ExpiryScanner</Text>
          <Text style={styles.headerSubtitle}>Scan products to check expiration dates</Text>
        </View>

        {/* Main Content */}
        <View style={styles.homeContent}>
          <View style={styles.iconContainer}>
            <View style={styles.scanIcon}>
              <Text style={styles.scanIconText}>📷</Text>
            </View>
          </View>

          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.descriptionText}>
            Tap the button below to start scanning product barcodes. Our AI will identify the product and estimate its shelf life.
          </Text>

          {/* Scan Button */}
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={startScanning}
            disabled={!permission.granted && permission.status !== 'undetermined'}
          >
            <Text style={styles.scanButtonText}>
              {permission.granted ? 'Start Scanning' : 'Grant Camera Permission'}
            </Text>
          </TouchableOpacity>

          {/* View Inventory Button */}
          <TouchableOpacity 
            style={styles.inventoryButton}
            onPress={() => setShowInventory(true)}
          >
            <Text style={styles.inventoryButtonText}>View Inventory</Text>
          </TouchableOpacity>

          {!permission.granted && (
            <Text style={styles.permissionHint}>
              Camera permission is required to scan barcodes
            </Text>
          )}

          {/* Recent Results (if any) */}
          {scannedProduct && !isScanning && (
            <View style={styles.recentResult}>
              <Text style={styles.recentResultTitle}>Last Scanned:</Text>
              <Text style={styles.recentResultName}>{scannedProduct.name}</Text>
              <Text style={styles.recentResultStatus}>{scannedProduct.status}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by AI</Text>
        </View>
      </View>
    );
  }

  // 2. HANDLE BARCODE SCAN - Now uses real AI analysis
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isAnalyzing || !isScanning) {
      return; // Prevent duplicate scans or scan when not active
    }

    setScanned(true);
    setIsAnalyzing(true);
    setScannedProduct(null);

    try {
      console.log('🔍 Analyzing barcode:', data);

      // Call AI analysis service to get real product data
      const analysisResult = await analyzeProductFromBarcode(data);

      // Calculate status message based on shelf life
      const daysLeft = analysisResult.shelfLifeDays;
      let status;
      if (daysLeft < 0) {
        status = 'EXPIRED';
      } else if (daysLeft === 0) {
        status = 'EXPIRES TODAY';
      } else if (daysLeft === 1) {
        status = 'Expires tomorrow';
      } else {
        status = `Expires in ${daysLeft} days`;
      }

      // Update product state with real AI data
      setScannedProduct({
        barcode: data,
        name: analysisResult.name,
        category: analysisResult.category,
        daysLeft: daysLeft,
        shelfLifeDays: analysisResult.shelfLifeDays,
        confidenceScore: analysisResult.confidenceScore,
        status: status,
      });

      console.log('✅ Product analyzed successfully:', analysisResult);
      
      // Stop scanning after successful scan (camera will be hidden, result modal will show)
      setIsScanning(false);
    } catch (error) {
      // Silently handle error - don't show error messages, just open manual entry form
      // Only log to console for debugging (not console.error to avoid error overlays)
      if (__DEV__) {
        console.log('AI analysis failed, opening manual entry form');
      }

      // Immediately stop scanning and reset states - do this first
      setIsScanning(false);
      setIsAnalyzing(false);
      setScanned(false);

      // Store the failed barcode and prepare manual entry
      setFailedBarcode(data);
      setScannedProduct(null);

      // Clear any previous manual entries
      setManualProductImage(null);
      setManualBatchCode(data || ''); // Pre-fill with scanned barcode
      setManualExpiryDate('');

      // Set a friendly message for the modal (not an error message)
      setAiErrorMessage('Please upload a product image, enter the batch code, and expiry date to check the product.');

      // Immediately open manual entry modal - no error display
      setManualEntryVisible(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle saving product to inventory
  const handleSaveToInventory = async () => {
    if (!scannedProduct) {
      return;
    }

    try {
      setSavingToInventory(true);

      // Calculate expiry date from days left
      const expiryDate = scannedProduct.daysLeft !== undefined
        ? new Date(Date.now() + scannedProduct.daysLeft * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        : null;

      await addInventoryItem({
        barcode: scannedProduct.barcode || null,
        product_name: scannedProduct.name || null,
        category: scannedProduct.category || null,
        expiry_date: expiryDate,
        ai_confidence: scannedProduct.confidenceScore || null,
      });

      Alert.alert(
        'Success',
        'Product saved to inventory!',
        [
          {
            text: 'View Inventory',
            onPress: () => {
              closeResult();
              setShowInventory(true);
            },
          },
          {
            text: 'OK',
            onPress: closeResult,
          },
        ]
      );
    } catch (error) {
      console.error('Error saving to inventory:', error);
      Alert.alert(
        'Error',
        'Failed to save product to inventory. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSavingToInventory(false);
    }
  };

  // Handle image picker for manual entry
  const pickProductImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permission is required to upload product images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setManualProductImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle manual product entry submission
  const handleManualProductSubmit = () => {
    if (!manualBatchCode.trim() || !manualExpiryDate.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter the batch code and expiry date.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!manualProductImage) {
      Alert.alert(
        'Missing Image',
        'Please upload a product image.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Calculate days left from expiry date
    try {
      const expiryDate = new Date(manualExpiryDate);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status;
      if (daysLeft < 0) {
        status = 'EXPIRED';
      } else if (daysLeft === 0) {
        status = 'EXPIRES TODAY';
      } else if (daysLeft === 1) {
        status = 'Expires tomorrow';
      } else {
        status = `Expires in ${daysLeft} days`;
      }

      // Store values before clearing for logging
      const savedBatchCode = manualBatchCode.trim();
      const savedExpiryDate = manualExpiryDate;
      const savedImageUri = manualProductImage;

      // Update product state with manual entry data
      setScannedProduct({
        barcode: savedBatchCode,
        name: 'Manual Entry', // Will be updated when AI analyzes the image
        category: 'General',
        daysLeft: daysLeft,
        shelfLifeDays: daysLeft,
        confidenceScore: 1.0, // 100% confidence for manual entry
        status: status,
        isManualEntry: true, // Flag to indicate manual entry
        imageUri: savedImageUri, // Store image URI for potential future AI analysis
      });

      // Close manual entry modal and show results
      setManualEntryVisible(false);
      setFailedBarcode(null);
      setManualProductImage(null);
      setManualBatchCode('');
      setManualExpiryDate('');
      setAiErrorMessage('');

      console.log('✅ Manual product entry saved:', {
        batchCode: savedBatchCode,
        expiryDate: savedExpiryDate,
        daysLeft,
        hasImage: !!savedImageUri,
      });
    } catch (error) {
      Alert.alert(
        'Invalid Date',
        'Please enter a valid expiry date (YYYY-MM-DD format).',
        [{ text: 'OK' }]
      );
    }
  };

  // 4. SCANNING SCREEN - Only shown when isScanning is true
  return (
    <View style={styles.container}>
      
      {/* CAMERA LAYER - Only active when scanning */}
      {isScanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={(scanned || isAnalyzing) ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "upc_e", "code128", "ean8", "upc_a"], 
          }}
        />
      )}

      {/* LOADING OVERLAY - Show while AI is analyzing */}
      {isAnalyzing && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isAnalyzing}
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>AI Agent analyzing...</Text>
              <Text style={styles.loadingSubtext}>Identifying product details</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* SCANNER UI - Overlay with target box and controls */}
      {isScanning && (
        <>
          {/* OVERLAY: TARGET BOX */}
          <View style={styles.overlay}>
            {/* Semi-transparent background */}
            <View style={styles.overlayBackground} />
            
            {/* Scanning frame */}
            <View style={styles.scanFrameContainer}>
              <View style={styles.scanFrame} />
              <Text style={styles.overlayText}>Align barcode within frame</Text>
            </View>
          </View>

          {/* Back Button */}
          <View style={styles.scannerControls}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={stopScanning}
            >
              <Text style={styles.backButtonText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* RESULT POPUP (MODAL) - Show results even when not scanning */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scannedProduct !== null && !isAnalyzing && !isScanning}
        onRequestClose={closeResult}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.productName}>{scannedProduct?.name}</Text>
            <Text style={styles.barcodeText}>Code: {scannedProduct?.barcode}</Text>
            
            {/* Category Badge */}
            {scannedProduct?.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{scannedProduct.category}</Text>
              </View>
            )}

            {/* Confidence Score (if available) */}
            {scannedProduct?.confidenceScore !== undefined && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>AI Confidence:</Text>
                <Text style={styles.confidenceValue}>
                  {Math.round(scannedProduct.confidenceScore * 100)}%
                </Text>
              </View>
            )}
            
            {/* Dynamic Status Box */}
            <View style={[
              styles.statusBox, 
              (scannedProduct?.daysLeft <= 2) ? styles.bgDanger : styles.bgSafe
            ]}>
              <Text style={styles.statusText}>
                {scannedProduct?.status}
              </Text>
              {scannedProduct?.shelfLifeDays !== undefined && (
                <Text style={styles.daysLeftText}>
                  Shelf Life: {scannedProduct.shelfLifeDays} days
                </Text>
              )}
            </View>

            {/* Save to Inventory Button */}
            <TouchableOpacity 
              style={[styles.saveButton, savingToInventory && styles.saveButtonDisabled]} 
              onPress={handleSaveToInventory}
              disabled={savingToInventory}
            >
              {savingToInventory ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </>
              ) : (
                <Text style={styles.saveButtonText}>Save to Inventory</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resultButtons}>
              <TouchableOpacity style={styles.scanBtn} onPress={closeResult}>
                <Text style={styles.scanBtnText}>Done</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.scanBtn, styles.scanAgainBtn]} 
                onPress={() => {
                  closeResult();
                  startScanning();
                }}
              >
                <Text style={styles.scanBtnText}>Scan Another</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* MANUAL ENTRY MODAL - When AI fails to identify product */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={manualEntryVisible}
        onRequestClose={() => {
          setManualEntryVisible(false);
          setFailedBarcode(null);
          setManualProductImage(null);
          setManualBatchCode('');
          setManualExpiryDate('');
          setAiErrorMessage('');
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            contentContainerStyle={styles.modalContentScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manual Product Entry</Text>
                <Text style={styles.modalSubtitle}>
                  {aiErrorMessage || 'Please upload a product image, enter the batch code, and expiry date to check the product.'}
                </Text>
              </View>

              {/* Product Image Upload */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Image *</Text>
                {manualProductImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: manualProductImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setManualProductImage(null)}
                    >
                      <Text style={styles.removeImageButtonText}>Remove Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imageUploadButton}
                    onPress={pickProductImage}
                  >
                    <Text style={styles.imageUploadButtonText}>📷 Upload Product Image</Text>
                    <Text style={styles.imageUploadHint}>Tap to select from gallery</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Batch Code Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Batch Code *</Text>
                <TextInput
                  style={styles.input}
                  value={manualBatchCode}
                  onChangeText={setManualBatchCode}
                  placeholder="Enter batch code or barcode"
                  placeholderTextColor="#9CA3AF"
                  autoFocus={true}
                  keyboardType="default"
                />
                {failedBarcode && (
                  <Text style={styles.inputHint}>
                    Scanned code: {failedBarcode} (you can edit this)
                  </Text>
                )}
              </View>

              {/* Expiry Date Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Expiry Date *</Text>
                <TextInput
                  style={styles.input}
                  value={manualExpiryDate}
                  onChangeText={setManualExpiryDate}
                  placeholder="YYYY-MM-DD (e.g., 2024-12-31)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="default"
                />
                <Text style={styles.inputHint}>
                  Enter the expiry date in YYYY-MM-DD format
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setManualEntryVisible(false);
                    setFailedBarcode(null);
                    setManualProductImage(null);
                    setManualBatchCode('');
                    setManualExpiryDate('');
                    setAiErrorMessage('');
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleManualProductSubmit}
                >
                  <Text style={styles.modalButtonTextSubmit}>Check Expiry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  // Camera Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  overlayText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 5,
    overflow: 'hidden',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    alignItems: 'center',
    minHeight: 300,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  barcodeText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  statusBox: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  bgSafe: {
    backgroundColor: '#d1fae5', // Light Green
  },
  bgDanger: {
    backgroundColor: '#fee2e2', // Light Red
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scanBtn: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading Overlay Styles
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 280,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  // Additional Product Info Styles
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  categoryText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  daysLeftText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Home Screen Styles
  homeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  homeContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  scanIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanIconText: {
    fontSize: 60,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: '#000',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 250,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  inventoryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginTop: 15,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 250,
  },
  inventoryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  recentResult: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recentResultTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentResultName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentResultStatus: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingScreenText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Scanner Controls
  scannerControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanFrameContainer: {
    position: 'relative',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultButtons: {
    width: '100%',
    gap: 12,
  },
  scanAgainBtn: {
    backgroundColor: '#333',
    marginTop: 12,
  },
  // Manual Entry Modal Styles
  modalContentScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  scannedCodeBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scannedCodeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scannedCodeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonSubmit: {
    backgroundColor: '#000',
  },
  modalButtonTextCancel: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Image Upload Styles
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  imageUploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  imageUploadHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});