-- Create table for storing Microsoft Graph tokens
CREATE TABLE microsoft_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    scope text,
    token_type text DEFAULT 'Bearer',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one token per user per profile
    UNIQUE(user_id, profile_email)
);

-- Enable RLS
ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tokens" 
    ON microsoft_tokens FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
    ON microsoft_tokens FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
    ON microsoft_tokens FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
    ON microsoft_tokens FOR DELETE 
    USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_microsoft_tokens_updated_at 
    BEFORE UPDATE ON microsoft_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
