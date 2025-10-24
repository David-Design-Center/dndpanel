import { supabase } from '@/lib/supabase';

export async function deleteOrder(orderId: string): Promise<boolean> {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) {
    console.error('deleteOrder error:', error);
    return false;
  }
  return true;
}

export async function fetchOrdersWithSuppliers(createdBy?: string) {
  let query = supabase.from('orders').select('*');
  if (createdBy) {
    query = query.eq('created_by', createdBy);
  }
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
