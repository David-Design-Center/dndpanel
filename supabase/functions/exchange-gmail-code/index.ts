import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('Request body received:', requestBody)
    
    const { code, redirectUri, profileId } = requestBody
    
    if (!code || !redirectUri) {
      console.error('Missing required fields:', { code: !!code, redirectUri: !!redirectUri })
      return new Response(
        JSON.stringify({ error: 'Authorization code and redirect URI are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables (these should be set in Supabase dashboard)
    const clientId = Deno.env.get('GAPI_CLIENT_ID')
    const clientSecret = Deno.env.get('GAPI_CLIENT_SECRET')
    
    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0
    })
    
    if (!clientId || !clientSecret) {
      console.error('Missing GAPI_CLIENT_ID or GAPI_CLIENT_SECRET environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Exchange authorization code for tokens
    console.log('Attempting to exchange code for tokens with Google...')
    const tokenRequestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }
    console.log('Token request body:', { ...tokenRequestBody, client_secret: '[REDACTED]' })
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestBody),
    })

    console.log('Google token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Google token exchange failed:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange code for tokens', details: errorData }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokenData = await tokenResponse.json()
    
    // If we have a profileId, update the profile with the refresh token
    if (profileId && tokenData.refresh_token) {
      try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Update the profile with the refresh token
        const expiryDate = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            gmail_access_token: tokenData.access_token,
            gmail_refresh_token: tokenData.refresh_token,
            gmail_token_expiry: expiryDate
          })
          .eq('id', profileId)

        if (updateError) {
          console.error('Error updating profile with tokens:', updateError)
          // Don't fail the entire request if profile update fails
        } else {
          console.log('Successfully updated profile with Gmail tokens')
        }
      } catch (profileError) {
        console.error('Error updating profile:', profileError)
        // Don't fail the entire request if profile update fails
      }
    }
    
    // Return the tokens to the client
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in || 3600,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in exchange-gmail-code function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})