-- Add out of office status to the existing out_of_office_settings JSONB column
-- This keeps everything in one place within the profiles table

-- Update existing profiles to include the status flag in their out_of_office_settings
UPDATE profiles 
SET out_of_office_settings = 
  CASE 
    WHEN out_of_office_settings IS NULL OR out_of_office_settings = '{}'::jsonb THEN
      CASE 
        WHEN name = 'David' THEN '{
          "isOutOfOffice": false,
          "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I will get back to you when I return.</p><p>Thank you, have a blessed day.</p><p>David</p></div>"
        }'::jsonb
        WHEN name = 'Marti' THEN '{
          "isOutOfOffice": false,
          "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I will get back to you when I return.</p><p>Thank you for your understanding.</p><p>Marti</p></div>"
        }'::jsonb
        WHEN name = 'Natalia' THEN '{
          "isOutOfOffice": false,
          "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I will get back to you when I return.</p><p>Thank you for your understanding.</p><p>Natalia</p></div>"
        }'::jsonb
        WHEN name = 'Dimitry' THEN '{
          "isOutOfOffice": false,
          "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently. I will get back to you when I return.</p><p>Thank you for your understanding.</p><p>Dimitry</p></div>"
        }'::jsonb
        ELSE '{
          "isOutOfOffice": false,
          "autoReplyMessage": "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><p>Hi,</p><p>I am out of office currently.</p><p>Thank you for your understanding.</p></div>"
        }'::jsonb
      END
    ELSE 
      -- Add isOutOfOffice flag to existing settings
      out_of_office_settings || '{"isOutOfOffice": false}'::jsonb
  END
WHERE name IN ('David', 'Marti', 'Natalia', 'Dimitry');

-- Add helpful comment
COMMENT ON COLUMN profiles.out_of_office_settings IS 'JSON object containing isOutOfOffice (boolean), autoReplyMessage (string) for out of office functionality';
