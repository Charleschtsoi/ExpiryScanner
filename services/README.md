# Services Documentation

## AI Analysis Service

The `aiAnalysis.ts` service provides a clean interface for analyzing products using AI.

### Usage

```typescript
import { analyzeProductFromBarcode, analyzeProduct } from './services/aiAnalysis';

// Analyze from barcode
const result = await analyzeProductFromBarcode('123456789');

// Or use the general function
const result = await analyzeProduct({
  barcode: '123456789',
  // imageUri: 'base64...', // Future: for image analysis
});
```

### Return Format

```typescript
interface ProductAnalysisResult {
  name: string;              // Product name
  category: string;          // Product category (e.g., "Dairy", "Vegetable")
  shelfLifeDays: number;     // Estimated shelf life in days
  confidenceScore?: number;  // AI confidence (0-1)
  expiryDate?: string;       // ISO date string
  manualEntryRequired?: boolean; // If manual entry is needed
}
```

### Error Handling

The service throws `AIAnalysisError` for specific error cases:

```typescript
try {
  const result = await analyzeProductFromBarcode(barcode);
} catch (error) {
  if (error instanceof AIAnalysisError) {
    if (error.code === 'MANUAL_ENTRY_REQUIRED') {
      // Handle manual entry requirement
    }
  }
}
```

### Configuration

Ensure these environment variables are set:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Check configuration:
```typescript
import { isAIAnalysisConfigured } from './services/aiAnalysis';

if (!isAIAnalysisConfigured()) {
  console.error('AI Analysis is not configured!');
}
```

## Future: Image Analysis

For image-based analysis (when implemented):

```typescript
import { analyzeProductFromImage } from './services/aiAnalysis';

// Capture image using expo-image-picker
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchCameraAsync({
  allowsEditing: true,
  quality: 0.8,
});

if (!result.canceled) {
  const analysisResult = await analyzeProductFromImage(result.assets[0].uri);
}
```

**Note:** Image analysis requires:
1. Updating the Edge Function to accept base64 images
2. Configuring OpenAI Vision API or Gemini Vision API
3. Additional permissions for camera/image picker
