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
 * Analyzes a product using AI service (OpenAI GPT-4o via Supabase Edge Function)
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
      console.error('❌ Edge Function error:', error);
      throw new AIAnalysisError(
        error.message || 'Failed to analyze product',
        'EDGE_FUNCTION_ERROR',
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
      throw new AIAnalysisError(
        data.error || 'Error from AI service',
        'AI_SERVICE_ERROR'
      );
    }

    // Check if manual entry is required
    if (data.manualEntryRequired) {
      throw new AIAnalysisError(
        'Product could not be identified automatically. Manual entry required.',
        'MANUAL_ENTRY_REQUIRED',
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
