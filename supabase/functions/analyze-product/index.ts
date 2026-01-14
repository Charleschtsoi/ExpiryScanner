import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  code: string;
  imageUri?: string; // Optional: For future image-based analysis
}

interface AnalyzeResponse {
  productName: string;
  category: string;
  expiryDate: string;
  confidenceScore: number;
  manualEntryRequired?: boolean;
}

interface ProductMasterListRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  shelf_life_days: number | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Parse request body
    const { code }: AnalyzeRequest = await req.json();

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code is required and must be a non-empty string' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call OpenAI to analyze product
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a product information assistant. Based on a barcode or product code, estimate product details. 
            Return a JSON object with: productName (string), category (string like "Dairy", "Meat", "Produce", "Beverages", "Snacks", etc.), 
            expiryDate (ISO date string YYYY-MM-DD, estimate based on typical shelf life), and confidenceScore (float 0-1). 
            If uncertain, use "Unknown Product" for productName and a generic category. Make realistic estimates for expiry dates based on product type.`,
          },
          {
            role: 'user',
            content: `Guess the product details based on this barcode/text: ${code}. Return ONLY valid JSON in this exact format: {"productName": "...", "category": "...", "expiryDate": "YYYY-MM-DD", "confidenceScore": 0.0-1.0}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      
      // Try to parse error details for better error messages
      let errorMessage = 'Failed to analyze product with AI';
      let errorCode = 'OPENAI_API_ERROR';
      
      try {
        const errorJson = JSON.parse(errorData);
        const openAIError = errorJson.error || {};
        const errorType = openAIError.type || '';
        const errorCodeValue = openAIError.code || '';
        
        // Provide more specific error messages based on error type
        if (openAIResponse.status === 401) {
          errorMessage = 'OpenAI API key is invalid or expired';
          errorCode = 'INVALID_API_KEY';
        } else if (openAIResponse.status === 429) {
          errorMessage = 'OpenAI API rate limit exceeded. Please try again later';
          errorCode = 'RATE_LIMIT_EXCEEDED';
        } else if (openAIResponse.status === 500 || openAIResponse.status === 503) {
          errorMessage = 'OpenAI service temporarily unavailable. Please try again later';
          errorCode = 'SERVICE_UNAVAILABLE';
        } else if (errorType === 'insufficient_quota' || errorCodeValue === 'insufficient_quota') {
          errorMessage = 'OpenAI API quota exceeded. Please check your account credits';
          errorCode = 'QUOTA_EXCEEDED';
        } else if (errorType === 'invalid_request_error') {
          errorMessage = 'Invalid request to OpenAI API';
          errorCode = 'INVALID_REQUEST';
        }
        
        console.error('OpenAI error details:', {
          status: openAIResponse.status,
          type: errorType,
          code: errorCodeValue,
          message: openAIError.message,
        });
      } catch (parseError) {
        // If we can't parse the error, use the raw error data for logging
        console.error('Could not parse OpenAI error response:', errorData);
      }
      
      // Instead of returning 500 immediately, try database fallback first
      // This allows the app to still work even if OpenAI is down
      console.log('OpenAI API failed, attempting database fallback...');
      
      // Continue to database fallback logic below instead of returning error
      // This will be handled in the fallback section
    } else {
      // OpenAI API call succeeded - process the response
      const openAIData = await openAIResponse.json();
      const aiContent = openAIData.choices[0]?.message?.content;

      if (!aiContent) {
        console.error('OpenAI returned empty response');
        // Continue to fallback
      } else {
        // Parse AI response - extract JSON from markdown code blocks if present
        let parsedResponse: AnalyzeResponse;
        try {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || aiContent.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
          parsedResponse = JSON.parse(jsonString.trim());
        } catch (parseError) {
          console.error('Failed to parse AI response:', aiContent);
          // Fallback response
          parsedResponse = {
            productName: 'Unknown Product',
            category: 'General',
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            confidenceScore: 0.3,
          };
        }

        // Validate and normalize AI response
        const aiResponse: AnalyzeResponse = {
          productName: parsedResponse.productName || 'Unknown Product',
          category: parsedResponse.category || 'General',
          expiryDate: parsedResponse.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidenceScore: Math.max(0, Math.min(1, parsedResponse.confidenceScore || 0.5)),
        };

        // Validation: Check if AI response is reliable
        // Trigger fallback if confidenceScore < 0.6 OR productName is "Unknown Product"
        const shouldUseFallback = 
          aiResponse.confidenceScore < 0.6 || 
          aiResponse.productName.toLowerCase().includes('unknown');

        if (!shouldUseFallback) {
          // AI response is reliable - return it
          return new Response(
            JSON.stringify(aiResponse),
            {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          );
        }
        // Otherwise continue to database fallback
      }
    }
    
    // Fallback: Database Lookup (runs if OpenAI failed or AI response was unreliable)
    try {
      // Create Supabase client for database access
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Supabase credentials not configured, skipping database fallback');
      } else {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
        // Query product_master_list table
        const { data: dbProduct, error: dbError } = await supabaseClient
          .from('product_master_list')
          .select('code, name, category, shelf_life_days')
          .eq('code', code.trim())
          .single();

        if (!dbError && dbProduct) {
          // Database match found - prioritize DB data (100% accurate)
          const dbExpiryDate = dbProduct.shelf_life_days 
            ? new Date(Date.now() + dbProduct.shelf_life_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default 7 days if shelf_life_days is null

          const response: AnalyzeResponse = {
            productName: dbProduct.name,
            category: dbProduct.category || 'General',
            expiryDate: dbExpiryDate,
            confidenceScore: 1.0, // 100% confidence for database matches
          };

          return new Response(
            JSON.stringify(response),
            {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          );
        } else {
          // Database lookup failed - return manual entry flag
          console.log('Database lookup failed for code:', code);
        }
      }
    } catch (dbLookupError) {
      console.error('Error during database fallback lookup:', dbLookupError);
      // Continue to manual entry fallback
    }

    // Both AI and DB failed - require manual entry
    const response: AnalyzeResponse = {
      productName: 'Unknown Product',
      category: 'General',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidenceScore: 0,
      manualEntryRequired: true,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-product function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
