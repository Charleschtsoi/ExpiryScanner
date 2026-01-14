# Debugging AI Connection Issues

## Common Issues and Solutions

### Issue 1: Edge Function Not Deployed
**Symptoms:** Error like "Function not found" or 404 errors

**Solution:**
```bash
# Deploy the Edge Function
supabase functions deploy analyze-product

# Verify deployment
supabase functions list
```

### Issue 2: OpenAI API Key Not Set or Invalid
**Symptoms:** Error "OpenAI API key is not configured" or 500 errors

**Solution:**
```bash
# Set the OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Verify secrets are set
supabase secrets list
```

**Common OpenAI API Errors:**
- **401 Unauthorized**: API key is invalid or expired - generate a new key
- **429 Rate Limit**: Too many requests - wait a moment and retry
- **500/503 Service Unavailable**: OpenAI service is down - try again later
- **Insufficient Quota**: Account has no credits - add credits to your OpenAI account

**Note:** The app gracefully handles OpenAI failures by falling back to manual entry, so users can still add products even if AI is unavailable.

### Issue 3: Supabase Environment Variables Not Set
**Symptoms:** Warning in console about Supabase URL/Key, or Edge Function calls fail

**Solution:**
1. Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Install expo-constants to load environment variables:
```bash
npx expo install expo-constants
```

3. Restart Expo dev server after adding environment variables

### Issue 4: Service Role Key Not Set (for database fallback)
**Symptoms:** Database fallback doesn't work, but AI might still work

**Solution:**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Issue 5: CORS Issues
**Symptoms:** Network errors or CORS errors in browser/console

**Solution:**
- The Edge Function already includes CORS headers
- Make sure the Edge Function is deployed correctly
- Check that your Supabase project URL is correct

## Testing Steps

1. **Check Edge Function is accessible:**
```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/analyze-product \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'
```

2. **Check logs:**
```bash
supabase functions logs analyze-product
```

3. **Test locally (if using Supabase CLI):**
```bash
supabase functions serve analyze-product
```

### Issue 6: 401 Unauthorized Error
**Symptoms:** Edge Function returns 401 error

**Common Causes:**
1. Using publishable key (`sb_publishable_*`) instead of JWT anon key (`eyJ*`)
2. Placeholder credentials in `.env` file
3. Environment variables not loaded (Expo server not restarted)

**Solution:**
1. Verify `.env` has JWT anon key (starts with `eyJ`)
2. Get correct key from Supabase Dashboard → Settings → API → "anon public" key
3. Restart Expo: `npx expo start --clear`

### Issue 7: 500 Internal Server Error
**Symptoms:** Edge Function returns 500 error

**Common Causes:**
1. OpenAI API key invalid or expired
2. OpenAI API quota exceeded
3. OpenAI service temporarily unavailable

**Solution:**
1. Check OpenAI API key: `supabase secrets list | grep OPENAI`
2. Verify OpenAI account has credits
3. Check OpenAI status page for service issues
4. App will automatically fall back to manual entry

## Error Handling Improvements

The app now includes improved error handling:

1. **User-Friendly Messages**: Technical errors are converted to actionable messages
2. **Graceful Fallbacks**: AI failures trigger database lookup, then manual entry
3. **Error Codes**: Specific error codes help identify issues quickly
4. **Better Logging**: More detailed error information for debugging

## Frontend Debugging

Add console logs to see what's happening:
- Check if `supabase.functions.invoke` is being called
- Check the error response from the Edge Function
- Verify environment variables are loaded in the app
- Look for user-friendly error messages in the UI