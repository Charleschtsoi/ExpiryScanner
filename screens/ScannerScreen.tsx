import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { InventoryInsert } from '../types/supabase';
import '../global.css';

interface ProductData {
  productName: string;
  category: string;
  expiryDate: string;
  confidenceScore: number;
  manualEntryRequired?: boolean;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualEntryRequired, setManualEntryRequired] = useState(false);
  const lastAnalyzedCodeRef = useRef<string | null>(null);

  // Handle camera permissions
  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-base mb-5 text-center text-gray-800">
          We need camera access to scan barcodes.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-black px-8 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Call Supabase Edge Function to analyze product
  const analyzeProduct = useCallback(async (code: string) => {
    // Prevent duplicate analysis of the same code
    if (lastAnalyzedCodeRef.current === code) {
      console.log('Skipping duplicate analysis for code:', code);
      return;
    }

    lastAnalyzedCodeRef.current = code;
    setIsAnalyzing(true);
    setProductData(null);

    console.log('Starting product analysis for code:', code);

    try {
      // Check if Supabase client is configured
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured. Please set EXPO_PUBLIC_SUPABASE_URL environment variable.');
      }

      console.log('Invoking Edge Function: analyze-product');
      
      const { data, error } = await supabase.functions.invoke('analyze-product', {
        body: { code },
      });

      console.log('Edge Function response - error:', error);
      console.log('Edge Function response - data:', data);

      if (error) {
        console.error('Edge Function error details:', {
          message: error.message,
          status: error.status,
          context: error.context,
        });
        
        // Try to read error response body to check for manualEntryRequired
        let errorBody = null;
        try {
          if (error.context?._bodyBlob && !error.context.bodyUsed) {
            errorBody = await error.context._bodyBlob.text();
          } else if (error.context?._bodyInit?._data) {
            const response = new Response(error.context._bodyInit);
            errorBody = await response.text();
          }
        } catch (e) {
          // Failed to read error body, continue
        }
        
        // Check if error response contains manualEntryRequired flag
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.manualEntryRequired === true) {
              // Error response indicates manual entry needed - open manual entry form
              console.log('✅ Error response indicates manual entry required');
              setManualCode(code);
              setManualEntryRequired(true);
              setProductModalVisible(false);
              setIsAnalyzing(false);
              setManualEntryVisible(true);
              return;
            }
          } catch (e) {
            // Not JSON, continue with error handling
          }
        }
        
        throw new Error(error.message || `Edge Function error: ${JSON.stringify(error)}`);
      }

      if (data) {
        // Check if the response contains an error property
        if (data.error) {
          throw new Error(data.error || 'Error from Edge Function');
        }

        const productData = data as ProductData;
        setProductData(productData);
        console.log('Product analyzed successfully:', productData);

        // Handle manualEntryRequired flag - automatically open manual entry modal
        if (productData.manualEntryRequired) {
          // Set the scanned code in manual entry field for convenience
          setManualCode(code);
          setManualEntryRequired(true);
          // Close any open modals
          setProductModalVisible(false);
          setIsAnalyzing(false);
          // Automatically open manual entry modal
          setManualEntryVisible(true);
        } else {
          // Reset manualEntryRequired flag
          setManualEntryRequired(false);
          // Show product found modal with AI/DB results
          setIsAnalyzing(false);
          setProductModalVisible(true);
        }
      } else {
        throw new Error('No data returned from analysis');
      }
    } catch (error) {
      console.error('Error analyzing product - full error:', error);
      lastAnalyzedCodeRef.current = null; // Reset on error to allow retry
      
      // Extract meaningful error message
      let errorMessage = 'Failed to analyze product. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      // Instead of showing Alert, open manual entry form so user can still enter product details
      console.log('❌ Analysis failed, opening manual entry form');
      setManualCode(code);
      setManualEntryRequired(true);
      setProductModalVisible(false);
      setIsAnalyzing(false);
      setManualEntryVisible(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Analyze product when scannedCode is set
  useEffect(() => {
    if (scannedCode && scannedCode !== lastAnalyzedCodeRef.current && !isAnalyzing) {
      analyzeProduct(scannedCode);
    }
  }, [scannedCode, isAnalyzing, analyzeProduct]);

  // Save product to inventory
  const saveToInventory = async () => {
    if (!productData || !scannedCode) {
      return;
    }

    setIsSaving(true);

    try {
      // Get current user session
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        throw new Error('You must be logged in to save items to inventory');
      }

      const inventoryItem: InventoryInsert = {
        user_id: session.user.id,
        barcode: scannedCode,
        product_name: productData.productName,
        category: productData.category,
        expiry_date: productData.expiryDate,
        ai_confidence: productData.confidenceScore,
      };

      const { error: insertError } = await supabase
        .from('inventory')
        .insert([inventoryItem]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Success', 'Product saved to inventory!', [
        {
          text: 'OK',
          onPress: () => {
            setProductModalVisible(false);
            resetScanner();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving to inventory:', error);
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Failed to save product to inventory. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scanner state
  const resetScanner = () => {
    setScanned(false);
    setScannedCode(null);
    setProductData(null);
    setIsAnalyzing(false);
    lastAnalyzedCodeRef.current = null;
  };

  // Handle barcode scan
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanned && !isAnalyzing) {
      setScanned(true);
      setScannedCode(data);
      console.log('Scanned code:', data);
    }
  };

  // Handle manual entry submission
  const handleManualSubmit = () => {
    if (manualCode.trim() && !isAnalyzing) {
      const trimmedCode = manualCode.trim();
      // Reset manual entry state
      setManualEntryVisible(false);
      setManualEntryRequired(false);
      setManualCode('');
      // Only trigger analysis if it's a different code
      if (trimmedCode !== lastAnalyzedCodeRef.current) {
        setScannedCode(trimmedCode);
        setScanned(true);
        console.log('Manually entered code:', trimmedCode);
      } else {
        // Same code - just reset scanner
        resetScanner();
      }
    }
  };


  return (
    <View className="flex-1 bg-black">
      {/* Camera View */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'upc_e', 'code128', 'ean8', 'upc_a'],
        }}
      />

      {/* Overlay with scanning frame */}
      <View className="absolute inset-0 justify-center items-center" pointerEvents="none">
        {/* Semi-transparent background overlay */}
        <View className="absolute inset-0 bg-black/50" />
        
        {/* Scanning frame - clear area indicator */}
        <View className="relative z-10">
          <View className="w-64 h-64 border-2 border-white rounded-2xl bg-transparent" />
          
          {/* Corner indicators */}
          <View className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <View className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <View className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <View className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
        </View>

        {/* Instruction text - below frame */}
        <View className="absolute z-10" style={{ top: '50%', marginTop: 160 }}>
          <Text className="text-white text-base bg-black/60 px-4 py-2 rounded-lg">
            Align barcode within frame
          </Text>
        </View>
      </View>

      {/* Loading overlay - shown when analyzing */}
      {isAnalyzing && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isAnalyzing}
        >
          <View className="flex-1 justify-center items-center bg-black/80">
            <View className="bg-white rounded-2xl p-8 items-center min-w-[280px]">
              <ActivityIndicator size="large" color="#000" className="mb-4" />
              <Text className="text-lg font-semibold text-gray-800 text-center">
                AI Agent searching...
              </Text>
              <Text className="text-sm text-gray-600 text-center mt-2">
                Analyzing product details
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom section with Manual Entry button */}
      {!isAnalyzing && (
        <View className="absolute bottom-0 left-0 right-0 pb-8 px-6">
          <TouchableOpacity
            onPress={() => setManualEntryVisible(true)}
            className="bg-white/90 px-6 py-4 rounded-full items-center shadow-lg"
          >
            <Text className="text-black text-base font-semibold">Manual Entry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Entry Modal (Bottom Sheet style) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={manualEntryVisible}
        onRequestClose={() => {
          setManualEntryVisible(false);
          setManualEntryRequired(false);
          setManualCode('');
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold mb-4 text-gray-800">
              {manualEntryRequired ? 'Product Not Found' : 'Enter Barcode Manually'}
            </Text>
            
            {manualEntryRequired && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <Text className="text-sm text-yellow-800">
                  We couldn't identify this product automatically. Please enter the barcode/code below, or try scanning again with a different product.
                </Text>
              </View>
            )}
            
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Enter barcode or code"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-800"
              autoFocus={!manualEntryRequired}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setManualEntryVisible(false);
                  setManualEntryRequired(false);
                  setManualCode('');
                  resetScanner();
                }}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-full items-center"
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleManualSubmit}
                className="flex-1 bg-black px-6 py-3 rounded-full items-center"
                disabled={isAnalyzing}
              >
                <Text className="text-white font-semibold">Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Found Modal (Bottom Sheet style) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={productModalVisible}
        onRequestClose={() => {
          setProductModalVisible(false);
          resetScanner();
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <Text className="text-2xl font-bold mb-2 text-gray-800">Product Found</Text>
            <Text className="text-sm text-gray-500 mb-6">Barcode: {scannedCode}</Text>

            {productData && (
              <View className="mb-6">
                {/* Product Name */}
                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Product Name</Text>
                  <Text className="text-xl font-semibold text-gray-800">{productData.productName}</Text>
                </View>

                {/* Category */}
                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Category</Text>
                  <View className="bg-blue-50 rounded-lg px-3 py-2 self-start">
                    <Text className="text-base font-medium text-blue-700">{productData.category}</Text>
                  </View>
                </View>

                {/* Expiry Date */}
                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Estimated Expiry Date</Text>
                  <Text className="text-lg font-medium text-gray-800">{new Date(productData.expiryDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</Text>
                </View>

                {/* Confidence Score */}
                <View className="mb-6">
                  <Text className="text-xs text-gray-500 mb-2 uppercase tracking-wide">AI Confidence</Text>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${productData.confidenceScore * 100}%` }}
                      />
                    </View>
                    <Text className="text-sm font-semibold text-gray-700 w-12 text-right">
                      {Math.round(productData.confidenceScore * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setProductModalVisible(false);
                  resetScanner();
                }}
                className="flex-1 bg-gray-200 px-6 py-4 rounded-full items-center"
                disabled={isSaving}
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={saveToInventory}
                className="flex-1 bg-black px-6 py-4 rounded-full items-center"
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Save to Inventory</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
