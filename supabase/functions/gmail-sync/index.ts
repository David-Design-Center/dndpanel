import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { google } from "npm:googleapis@105";
import { importPKCS8, SignJWT } from "https://deno.land/x/jose@v4.15.0/index.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define scopes required for the sync
const SCOPES = [
    "https://mail.google.com/", // Full access to matching the working function
    "https://www.googleapis.com/auth/gmail.labels"
];

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get the user from the authorization header (JWT)
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get request body
        const { profile_id } = await req.json();

        if (!profile_id) {
            return new Response(JSON.stringify({ error: 'Missing profile_id' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Fetch Profile to get Email
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, userEmail')
            .eq('id', profile_id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Profile not found or inaccessible' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Syncing labels for profile ${profile.userEmail}...`);

        // 2. Generate Access Token using Service Account (Domain-Wide Delegation)
        const keyJson = Deno.env.get("GOOGLE_SA_KEY");
        if (!keyJson) throw new Error("Missing GOOGLE_SA_KEY");

        const key = JSON.parse(keyJson);
        const pk = await importPKCS8(key.private_key, "RS256");

        const now = Math.floor(Date.now() / 1000);
        const jwt = await new SignJWT({
            iss: key.client_email,
            sub: profile.userEmail, // Impersonate this user
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
            scope: SCOPES.join(" ")
        }).setProtectedHeader({
            alg: "RS256",
            typ: "JWT"
        }).sign(pk);

        // Exchange JWT for access_token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwt
            })
        });

        const tokenJson = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("❌ Token endpoint error:", tokenJson);
            throw new Error(`Failed to get access token: ${tokenJson.error_description || tokenJson.error}`);
        }

        const accessToken = tokenJson.access_token;

        // 3. Initialize Gmail API with the new Access Token
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 4. Fetch all labels
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        const labels = labelsResponse.data.labels || [];

        // 5. Upsert into Supabase (gmail_accounts) - DO THIS FIRST so we have account.id
        let { data: account } = await supabaseClient
            .from('gmail_accounts')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

        if (!account) {
            const { data: newAccount, error: createError } = await supabaseClient
                .from('gmail_accounts')
                .insert({
                    profile_id: profile.id,
                    email: profile.userEmail!,
                    sync_status: 'syncing'
                })
                .select()
                .single();

            if (createError) throw createError;
            account = newAccount;
        }

        // Helper to get label details
        const getLabelDetails = async (id: string) => {
            try {
                const res = await gmail.users.labels.get({ userId: 'me', id });
                return res.data;
            } catch (e) {
                console.error(`Failed to fetc label ${id}`, e);
                return null;
            }
        };

        // BATCH PROCESSING
        const BATCH_SIZE = 5; // Process 5 labels at a time
        let processedCount = 0;

        for (let i = 0; i < labels.length; i += BATCH_SIZE) {
            const batch = labels.slice(i, i + BATCH_SIZE);

            // Fetch details in parallel for this batch
            const batchResults = await Promise.all(
                batch.map(label => label.id ? getLabelDetails(label.id) : Promise.resolve(null))
            );

            const enrichedLabels = batchResults.filter(l => l !== null);

            if (enrichedLabels.length > 0) {
                const ops = enrichedLabels.map(l => ({
                    gmail_account_id: account.id,
                    label_id: l.id,
                    name: l.name,
                    type: l.type,
                    messages_total: l.messagesTotal || 0,
                    messages_unread: l.messagesUnread || 0,
                    threads_total: l.threadsTotal || 0,
                    threads_unread: l.threadsUnread || 0,
                    last_synced_at: new Date().toISOString()
                }));

                // Progressive Upsert
                const { error: upsertError } = await supabaseClient
                    .from('gmail_labels')
                    .upsert(ops, { onConflict: 'gmail_account_id,label_id' });

                if (upsertError) console.error('Batch upsert error:', upsertError);
            }

            processedCount += enrichedLabels.length;
            // No strict sleep based on concurrency, or small sleep to yield
            // await new Promise(r => setTimeout(r, 20)); 
        }

        // (Account creation moved up)
        // (Upserts handled in loop)

        // Update account sync status
        await supabaseClient
            .from('gmail_accounts')
            .update({
                last_full_sync_at: new Date().toISOString(),
                sync_status: 'idle'
            })
            .eq('id', account.id);

        return new Response(
            JSON.stringify({ success: true, count: processedCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
