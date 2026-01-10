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

### Issue 2: OpenAI API Key Not Set
**Symptoms:** Error "OpenAI API key is not configured" or 500 errors

**Solution:**
```bash
# Set the OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Verify secrets are set
supabase secrets list
```

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

## Frontend Debugging

Add console logs to see what's happening:
- Check if `supabase.functions.invoke` is being called
- Check the error response from the Edge Function
- Verify environment variables are loaded in the app
