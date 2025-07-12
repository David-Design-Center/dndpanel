import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { refreshToken, profileId } = await req.json()
    
    console.log('Received request body:', { refreshToken: refreshToken ? '***' : null, profileId })
    
    if (!refreshToken) {
      console.error('Missing refresh token in request')
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
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
      clientId: clientId ? '***' : 'MISSING', 
      clientSecret: clientSecret ? '***' : 'MISSING' 
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

    // Call Google's token endpoint to refresh the access token
    console.log('Calling Google token endpoint...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    console.log('Google API response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Google token refresh failed:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to refresh token', 
          details: errorData,
          status: tokenResponse.status 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Return the new access token and expiry info
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 3600,
        token_type: tokenData.token_type || 'Bearer'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in refresh-gmail-token function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})