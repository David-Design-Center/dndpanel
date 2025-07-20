import { supabase } from '../lib/supabase';

export async function getNextPoNumber(): Promise<string> {
  try {
    console.log('Getting next PO number from invoices table...'); // Debug log
    
    // Get the highest PO number from the invoices table
    const { data, error } = await supabase
      .from('invoices')
      .select('po_number')
      .not('po_number', 'is', null)
      .order('po_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error querying invoices table:', error);
      // Fallback to a default starting number
      const fallback = 10773;
      console.log('Using fallback PO number:', fallback);
      return fallback.toString();
    }
    
    let nextPoNumber = 10773; // Default starting number
    
    if (data && data.length > 0 && data[0].po_number) {
      // Parse the highest PO number and add 1
      const highestPo = parseInt(data[0].po_number, 10);
      if (!isNaN(highestPo)) {
        nextPoNumber = highestPo + 1;
      }
    }
    
    console.log('Next PO number calculated:', nextPoNumber); // Debug log
    return nextPoNumber.toString();
  } catch (error) {
    console.error('Error getting next PO number:', error);
    // Fallback to default number
    const fallback = 10773;
    console.log('Using fallback PO number due to exception:', fallback);
    return fallback.toString();
  }
}

export async function getCurrentPoNumber(): Promise<number> {
  try {
    // Get the highest PO number from the invoices table
    const { data, error } = await supabase
      .from('invoices')
      .select('po_number')
      .not('po_number', 'is', null)
      .order('po_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0 && data[0].po_number) {
      const currentPo = parseInt(data[0].po_number, 10);
      return !isNaN(currentPo) ? currentPo : 10772;
    }
    
    return 10772;
  } catch (error) {
    console.error('Error getting current PO number:', error);
    return 10772;
  }
}
