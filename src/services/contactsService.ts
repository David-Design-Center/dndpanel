import { supabase } from '../lib/supabase';

/**
 * Generate initials from a name
 */
const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'SU'; // System User
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export interface Contact {
  id: string;
  fullName: string;
  email: string;
  phone1: string;
  phone2: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  // For displaying invoice/PO relationships
  invoiceCount?: number;
  poNumbers?: PONumberInfo[];
  contributors?: {
    name: string;
    initials: string;
  }[];
  // Backward compatibility aliases
  zip: string; // alias for zipCode
  tel1: string; // alias for phone1  
  tel2: string; // alias for phone2
  orderNumbers: string[]; // backward compatibility - just PO numbers as strings
}

export interface PONumberInfo {
  id: string;
  poNumber: string;
  label: string;
  isEdited: boolean;
  createdAt: string;
}

export interface ContactFormData {
  fullName: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/**
 * Fetch all contacts from the dedicated contacts table
 */
export const fetchContacts = async () => {
  console.log('🔄 contactsService: Fetching contacts from Supabase...');
  
  // Check authentication status
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('🔐 Current user:', user ? { id: user.id, email: user.email } : 'Not authenticated');
  
  if (authError) {
    console.error('❌ Auth error:', authError);
  }
  
  // Fetch contacts with related invoices to get PO numbers (including edited invoices)
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      id,
      full_name,
      email,
      phone_1,
      phone_2,
      address,
      city,
      state,
      zip_code,
      created_at,
      updated_at,
      invoices:invoices!contact_id (
        id,
        po_number,
        original_invoice_id,
        created_at,
        created_by
      )
    `)
    .order('full_name', { ascending: true });

  console.log('📋 Supabase query result:', { data, error });

  if (error) {
    console.error('❌ Supabase error:', error);
    throw error;
  }

  console.log('✅ Contacts fetched successfully:', data?.length || 0, 'contacts');
  
  // Transform snake_case to camelCase for frontend
  const transformedData = data?.map(contact => {
    // Create enhanced PO number objects with labels and IDs
    const poNumbers = contact.invoices
      ?.filter(invoice => invoice.po_number && invoice.po_number.trim() !== '')
      .map(invoice => ({
        id: invoice.id,
        poNumber: invoice.po_number,
        label: invoice.original_invoice_id ? `${invoice.po_number} - Edited` : invoice.po_number,
        isEdited: !!invoice.original_invoice_id,
        createdAt: invoice.created_at
      }))
      .sort((a, b) => {
        // Sort by PO number first, then by original vs edited (original first)
        if (a.poNumber !== b.poNumber) {
          return a.poNumber.localeCompare(b.poNumber);
        }
        return a.isEdited ? 1 : -1; // Original first, then edited
      }) || [];
    
    // Count unique invoices for this contact
    // Generate contributors list from invoice created_by data
    const contributorsMap = new Map<string, { name: string; initials: string }>();
    
    contact.invoices?.forEach(invoice => {
      // Only add contributors if there's a valid created_by field
      if (invoice.created_by && invoice.created_by.trim() !== '' && invoice.created_by !== 'Unknown Staff') {
        const createdBy = invoice.created_by;
        if (!contributorsMap.has(createdBy)) {
          contributorsMap.set(createdBy, {
            name: createdBy,
            initials: getInitials(createdBy)
          });
        }
      }
    });
    
    const contributors = Array.from(contributorsMap.values());
    // No fallback - only show contributors if we have actual created_by data

    const invoiceCount = contact.invoices?.length || 0;

    return {
      id: contact.id,
      fullName: contact.full_name,
      email: contact.email,
      phone1: contact.phone_1,
      phone2: contact.phone_2,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      zipCode: contact.zip_code,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      // Add required properties for Contact interface compatibility
      zip: contact.zip_code, // alias for zipCode
      tel1: contact.phone_1, // alias for phone1  
      tel2: contact.phone_2, // alias for phone2
      orderNumbers: poNumbers.map(po => po.poNumber), // Backward compatibility - just PO numbers as strings
      contributors: contributors,
      poNumbers: poNumbers,
      invoiceCount: invoiceCount
    };
  }) || [];

  console.log('🔄 Transformed data:', transformedData);
  return transformedData;
};

/**
 * Create a new contact
 */
export const createContact = async (contact: Omit<Contact, 'id'>) => {
  const { data, error } = await supabase
    .from('contacts')
    .insert([{
      full_name: contact.fullName,
      email: contact.email,
      phone_1: contact.phone1,
      phone_2: contact.phone2,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      zip_code: contact.zipCode,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing contact
 */
export const updateContact = async (id: string, contact: Partial<Contact>) => {
  const updateData: any = {};
  
  if (contact.fullName !== undefined) updateData.full_name = contact.fullName;
  if (contact.email !== undefined) updateData.email = contact.email;
  if (contact.phone1 !== undefined) updateData.phone_1 = contact.phone1;
  if (contact.phone2 !== undefined) updateData.phone_2 = contact.phone2;
  if (contact.address !== undefined) updateData.address = contact.address;
  if (contact.city !== undefined) updateData.city = contact.city;
  if (contact.state !== undefined) updateData.state = contact.state;
  if (contact.zipCode !== undefined) updateData.zip_code = contact.zipCode;

  const { data, error } = await supabase
    .from('contacts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a contact
 * Note: This will also update related invoices to set contact_id to null
 */
export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    // First, update any invoices that reference this contact
    const { error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({ contact_id: null })
      .eq('contact_id', contactId);

    if (invoiceUpdateError) {
      console.error('Error updating invoices:', invoiceUpdateError);
      throw invoiceUpdateError;
    }

    // Then delete the contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteContact:', error);
    throw error;
  }
};

/**
 * Delete multiple contacts
 */
export const deleteContacts = async (contactIds: string[]): Promise<void> => {
  try {
    // Update invoices first
    const { error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({ contact_id: null })
      .in('contact_id', contactIds);

    if (invoiceUpdateError) {
      console.error('Error updating invoices:', invoiceUpdateError);
      throw invoiceUpdateError;
    }

    // Delete contacts
    const { error } = await supabase
      .from('contacts')
      .delete()
      .in('id', contactIds);

    if (error) {
      console.error('Error deleting contacts:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteContacts:', error);
    throw error;
  }
};

/**
 * Search contacts
 */
export const searchContacts = async (query: string): Promise<Contact[]> => {
  try {
    if (!query.trim()) {
      return await fetchContacts();
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        id,
        full_name,
        email,
        phone_1,
        phone_2,
        address,
        city,
        state,
        zip_code,
        created_at,
        updated_at,
        created_by
      `)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,city.ilike.%${query}%`)
      .order('full_name');

    if (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }

    if (!contacts) {
      return [];
    }

    // Convert to our Contact interface
    return contacts.map(contact => ({
      id: contact.id,
      fullName: contact.full_name,
      email: contact.email || '',
      phone1: contact.phone_1 || '',
      phone2: contact.phone_2 || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zipCode: contact.zip_code || '',
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      poNumbers: [],
      contributors: [{ name: 'System User', initials: 'SU' }],
      // Backward compatibility aliases
      zip: contact.zip_code || '',
      tel1: contact.phone_1 || '',
      tel2: contact.phone_2 || '',
      orderNumbers: []
    }));
  } catch (error) {
    console.error('Error in searchContacts:', error);
    throw error;
  }
};

/**
 * Export contacts to CSV
 */
export const exportContactsToCSV = (contacts: Contact[]) => {
  const headers = [
    'Full Name', 'Email', 'Phone 1', 'Phone 2', 'Address', 
    'City', 'State', 'Zip Code', 'Invoice Count', 'PO Numbers'
  ];
  
  const csvContent = [
    headers.join(','),
    ...contacts.map(contact => [
      `"${contact.fullName}"`,
      `"${contact.email}"`,
      `"${contact.phone1}"`,
      `"${contact.phone2}"`,
      `"${contact.address}"`,
      `"${contact.city}"`,
      `"${contact.state}"`,
      `"${contact.zipCode}"`,
      `"${contact.invoiceCount || 0}"`,
      `"${contact.poNumbers?.join('; ') || ''}"`
    ].join(','))
  ].join('\\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
