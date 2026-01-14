import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Product analysis result from AI service
 */
export interface ProductAnalysisResult {
  name: string;
  category: string;
  shelfLifeDays: number;
  confidenceScore?: number;
  expiryDate?: string; // ISO date string
  manualEntryRequired?: boolean;
}

/**
 * Options for product analysis
 */
export interface AnalyzeProductOptions {
  barcode?: string;
  imageUri?: string; // Base64 encoded image or URI (future implementation)
  code?: string; // Generic code field (for batch codes, etc.)
}

/**
 * Error thrown when AI analysis fails
 */
export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIAnalysisError';
  }
}

/**
 * Analyzes a product using AI service (OpenAI GPT-4o-mini via Supabase Edge Function)
 * 
 * This function can analyze products from:
 * - Barcode/QR code data
 * - Image of the product (future: when image processing is implemented)
 * - Generic product codes
 * 
 * @param options - Analysis options containing barcode, code, or imageUri
 * @returns Promise<ProductAnalysisResult> - Product analysis with name, category, and shelf life
 * @throws AIAnalysisError - When analysis fails
 */
export async function analyzeProduct(
  options: AnalyzeProductOptions
): Promise<ProductAnalysisResult> {
  // Extract the code to analyze (prioritize barcode > code)
  const codeToAnalyze = options.barcode || options.code;

  if (!codeToAnalyze && !options.imageUri) {
    throw new AIAnalysisError(
      'Either barcode/code or imageUri must be provided for analysis',
      'MISSING_INPUT'
    );
  }

  // If image is provided but not yet implemented, log a warning
  if (options.imageUri) {
    console.warn('Image analysis is not yet fully implemented. Using code-based analysis.');
    // Future: Add image processing here
    // For now, we'll use code-based analysis
  }

  try {
    // Check if Supabase is configured before attempting to use it
    if (!isSupabaseConfigured()) {
      throw new AIAnalysisError(
        'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.',
        'NOT_CONFIGURED'
      );
    }

    // Validate credentials are properly configured
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    const urlIsPlaceholder = supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project') || supabaseUrl.length === 0;
    const keyIsPlaceholder = supabaseKey.includes('placeholder') || supabaseKey.includes('your-anon') || supabaseKey.length === 0;
    const keyIsPublishable = supabaseKey.startsWith('sb_publishable_');
    const keyIsJWT = supabaseKey.startsWith('eyJ');
    
    // CRITICAL: If using placeholder credentials, Edge Functions will return 401
    if (urlIsPlaceholder || keyIsPlaceholder) {
      throw new AIAnalysisError(
        'Supabase credentials are not properly configured. The app is using placeholder credentials which will cause 401 errors.\n\n' +
        'Please:\n' +
        '1. Ensure .env file exists with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
        '2. Restart Expo dev server with: npx expo start --clear\n' +
        '3. Verify credentials are loaded (check console logs)',
        'PLACEHOLDER_CREDENTIALS'
      );
    }
    
    // CRITICAL: Edge Functions require JWT anon key, not publishable key
    if (keyIsPublishable && !keyIsJWT) {
      throw new AIAnalysisError(
        '❌ WRONG KEY TYPE DETECTED!\n\n' +
        'You are using a Supabase PUBLISHABLE key (starts with "sb_publishable_"), but Edge Functions require the JWT ANON key (starts with "eyJ").\n\n' +
        'To fix this:\n' +
        '1. Go to your Supabase Dashboard: https://app.supabase.com\n' +
        '2. Select your project\n' +
        '3. Go to Settings → API\n' +
        '4. Copy the "anon public" key (NOT the publishable key)\n' +
        '5. Update your .env file: EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n' +
        '6. Restart Expo dev server: npx expo start --clear\n\n' +
        'The anon key should start with "eyJ" (it\'s a JWT token).',
        'WRONG_KEY_TYPE'
      );
    }

    console.log('🔍 Starting AI analysis for:', {
      barcode: options.barcode,
      code: options.code,
      hasImage: !!options.imageUri,
    });

    // Invoke Supabase Edge Function for AI analysis
    const { data, error } = await supabase.functions.invoke('analyze-product', {
      body: {
        code: codeToAnalyze || '', // Send empty string if only image is provided
        imageUri: options.imageUri, // Pass image for future implementation
      },
    });

    if (error) {
      let errorBody = null;
      let errorStatus = error.context?.status || error.status;
      
      // Try multiple methods to read the error response body
      try {
        // Method 1: Try reading from _bodyBlob
        if (error.context?._bodyBlob && !error.context.bodyUsed) {
          try {
            const bodyText = await error.context._bodyBlob.text();
            errorBody = bodyText;
          } catch (blobError) {
            // Silently fail, try next method
          }
        }
        
        // Method 2: Try reading from _bodyInit if blob failed
        if (!errorBody && error.context?._bodyInit?._data) {
          try {
            const response = new Response(error.context._bodyInit);
            const bodyText = await response.text();
            errorBody = bodyText;
          } catch (initError) {
            // Silently fail, try next method
          }
        }
        
        // Method 3: Check if error has a direct message property
        if (!errorBody && error.message && error.message !== 'Edge Function returned a non-2xx status code') {
          errorBody = error.message;
        }
        
        // Method 4: Try to extract from error context if available
        if (!errorBody && error.context?.body) {
          try {
            if (typeof error.context.body === 'string') {
              errorBody = error.context.body;
            } else if (error.context.body instanceof Blob) {
              errorBody = await error.context.body.text();
            }
          } catch (bodyError) {
            // Silently fail
          }
        }
      } catch (e) {
        // Failed to read error body, continue with error handling
      }
      
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error status:', errorStatus);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      // Parse error message and create user-friendly error
      let userFriendlyMessage = 'Failed to analyze product';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (errorBody) {
        console.error('❌ Error response body:', errorBody);
        // Try to parse JSON error message
        try {
          const errorJson = JSON.parse(errorBody);
          
          // CRITICAL: Check if error response contains manualEntryRequired flag
          // If so, return result instead of throwing error - this allows manual entry form to open
          if (errorJson.manualEntryRequired === true) {
            console.log('✅ Error response indicates manual entry required, returning result instead of error');
            return {
              name: errorJson.productName || 'Unknown Product',
              category: errorJson.category || 'General',
              shelfLifeDays: calculateShelfLifeDays(errorJson.expiryDate),
              confidenceScore: errorJson.confidenceScore || 0,
              expiryDate: errorJson.expiryDate,
              manualEntryRequired: true,
            };
          }
          
          if (errorJson.error) {
            const errorMsg = errorJson.error.toLowerCase();
            console.error('❌ Edge Function error message:', errorJson.error);
            
            // Map technical errors to user-friendly messages
            if (errorMsg.includes('openai api key') || errorMsg.includes('api key is not configured')) {
              userFriendlyMessage = 'AI service is not properly configured. Please contact support.';
              errorCode = 'AI_NOT_CONFIGURED';
            } else if (errorMsg.includes('invalid') || errorMsg.includes('expired')) {
              userFriendlyMessage = 'AI service authentication failed. Please try again later.';
              errorCode = 'AI_AUTH_FAILED';
            } else if (errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
              userFriendlyMessage = 'AI service is temporarily busy. Please try again in a moment.';
              errorCode = 'AI_RATE_LIMIT';
            } else if (errorMsg.includes('temporarily unavailable') || errorMsg.includes('service')) {
              userFriendlyMessage = 'AI service is temporarily unavailable. Please try again later.';
              errorCode = 'AI_SERVICE_UNAVAILABLE';
            } else if (errorMsg.includes('failed to analyze')) {
              userFriendlyMessage = 'Could not identify this product automatically. Please enter the details manually.';
              errorCode = 'AI_ANALYSIS_FAILED';
            } else {
              userFriendlyMessage = 'Unable to analyze product. Please enter details manually.';
              errorCode = 'AI_ERROR';
            }
          }
        } catch (e) {
          // Not JSON, use the raw error body if it's a string
          if (typeof errorBody === 'string' && errorBody.length < 200) {
            userFriendlyMessage = errorBody;
          }
        }
      }
      
      // Handle HTTP status codes
      if (errorStatus === 401) {
        userFriendlyMessage = 'Authentication failed. Please restart the app.';
        errorCode = 'AUTH_FAILED';
      } else if (errorStatus === 500 && !errorBody) {
        userFriendlyMessage = 'Server error occurred. Please try again or enter details manually.';
        errorCode = 'SERVER_ERROR';
      } else if (errorStatus === 400) {
        userFriendlyMessage = 'Invalid request. Please check your input and try again.';
        errorCode = 'INVALID_REQUEST';
      } else if (errorStatus === 503 || errorStatus === 502) {
        userFriendlyMessage = 'Service temporarily unavailable. Please try again later.';
        errorCode = 'SERVICE_UNAVAILABLE';
      }
      
      // Try to get more details about the error
      if (error.context) {
        console.error('❌ Error context:', error.context);
      }
      if (error.message) {
        console.error('❌ Error message:', error.message);
      }
      
      // Use the user-friendly message we created above
      // If we couldn't parse a specific message, use a generic one
      if (!userFriendlyMessage || userFriendlyMessage === 'Failed to analyze product') {
        if (error.message?.includes('non-2xx')) {
          userFriendlyMessage = 'Unable to analyze product. Please enter details manually.';
        } else if (error.message && error.message.length < 100) {
          userFriendlyMessage = error.message;
        } else {
          userFriendlyMessage = 'Could not identify this product automatically. Please enter the details manually.';
        }
      }
      
      throw new AIAnalysisError(
        userFriendlyMessage,
        errorCode || 'EDGE_FUNCTION_ERROR',
        error
      );
    }

    if (!data) {
      throw new AIAnalysisError(
        'No data returned from AI analysis',
        'NO_RESPONSE'
      );
    }

    // Check if the response contains an error property
    if (data.error) {
      console.error('❌ AI service returned error:', data.error);
      throw new AIAnalysisError(
        data.error || 'Error from AI service',
        'AI_SERVICE_ERROR',
        data
      );
    }

    // Transform the Edge Function response to match our interface
    // Edge Function returns: { productName, category, expiryDate, confidenceScore }
    // We need: { name, category, shelfLifeDays, ... }
    
    const result: ProductAnalysisResult = {
      name: data.productName || data.name || 'Unknown Product',
      category: data.category || 'General',
      shelfLifeDays: calculateShelfLifeDays(data.expiryDate),
      confidenceScore: data.confidenceScore || 0,
      expiryDate: data.expiryDate,
      manualEntryRequired: data.manualEntryRequired || false,
    };
    
    // If manual entry is required, return the result with the flag
    // Don't throw error - let the calling code (App.js) handle opening the modal
    if (data.manualEntryRequired) {
      console.log('✅ Edge Function indicates manual entry required, returning result with flag');
      return result;
    }

    console.log('✅ AI analysis successful:', {
      name: result.name,
      category: result.category,
      shelfLifeDays: result.shelfLifeDays,
      confidence: result.confidenceScore,
    });

    return result;
  } catch (error) {
    // Re-throw AIAnalysisError as-is
    if (error instanceof AIAnalysisError) {
      throw error;
    }

    // Wrap other errors
    console.error('❌ Unexpected error during AI analysis:', error);
    throw new AIAnalysisError(
      error instanceof Error ? error.message : 'Unknown error occurred during analysis',
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * Analyzes product from barcode data
 * Convenience function for barcode-only analysis
 * 
 * @param barcode - The barcode/QR code string
 * @returns Promise<ProductAnalysisResult>
 */
export async function analyzeProductFromBarcode(
  barcode: string
): Promise<ProductAnalysisResult> {
  return analyzeProduct({ barcode });
}

/**
 * Analyzes product from an image (future implementation)
 * Note: Image analysis requires additional setup and API configuration
 * 
 * @param imageUri - Base64 encoded image or image URI
 * @returns Promise<ProductAnalysisResult>
 */
export async function analyzeProductFromImage(
  imageUri: string
): Promise<ProductAnalysisResult> {
  return analyzeProduct({ imageUri });
}

/**
 * Calculates shelf life in days from an expiry date
 * 
 * @param expiryDate - ISO date string (YYYY-MM-DD) or Date object
 * @returns number - Days until expiry (negative if expired)
 */
function calculateShelfLifeDays(expiryDate: string | Date | undefined): number {
  if (!expiryDate) {
    return 7; // Default shelf life if not provided
  }

  try {
    const expiry = typeof expiryDate === 'string' 
      ? new Date(expiryDate) 
      : expiryDate;
    
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating shelf life days:', error);
    return 7; // Default fallback
  }
}

/**
 * Helper function to check if Supabase is properly configured
 * 
 * @returns boolean - True if configuration is valid
 */
export function isAIAnalysisConfigured(): boolean {
  return isSupabaseConfigured();
}
