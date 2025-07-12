-- Add out of office settings to profiles table
ALTER TABLE profiles 
ADD COLUMN out_of_office_settings JSONB DEFAULT '{}';

-- Add some helpful comments
COMMENT ON COLUMN profiles.out_of_office_settings IS 'JSON object containing forward_to_email and auto_reply_message for out of office functionality';

-- Update existing profiles with default settings based on profile name
UPDATE profiles 
SET out_of_office_settings = CASE 
  WHEN name = 'David' THEN '{
    "forwardToEmail": "martisuvorov12@gmail.com",
    "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I forwarded your message to my associate.</p><p>Thank you, have a blessed day.</p><br><p>David</p></div>"
  }'::jsonb
  WHEN name = 'Marti' THEN '{
    "forwardToEmail": "martisuvorov12@gmail.com",
    "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I forwarded your message to my colleague.</p><p>Thank you for your understanding.</p><br><p>Marti</p></div>"
  }'::jsonb
  ELSE '{
    "forwardToEmail": "",
    "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently.</p><p>Thank you for your understanding.</p></div>"
  }'::jsonb
END
WHERE out_of_office_settings = '{}'::jsonb;
