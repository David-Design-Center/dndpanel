import { createClient } from '@supabase/supabase-js';

// Environment variables - update these with your actual values
const supabaseUrl = 'https://jvcdxglsoholhgapfpet.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y2R4Z2xzb2hvbGhnYXBmcGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzM0MjUsImV4cCI6MjA2NDAwOTQyNX0.1NPv3ocVOrhVjD0CjfU3FolCsbVEFGOdJAkxnWEPPdY';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to orders table...');
    
    // Note: This requires a service role key, not anon key
    // Since we only have anon key, let's just check what columns exist
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking orders table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Current columns in orders table:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data in orders table to check columns');
    }
    
    console.log('\nNote: To add missing columns, you need to:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_state TEXT,
ADD COLUMN IF NOT EXISTS customer_zip TEXT,
ADD COLUMN IF NOT EXISTS customer_tel1 TEXT,
ADD COLUMN IF NOT EXISTS customer_tel2 TEXT,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id TEXT;
    `);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addMissingColumns();
