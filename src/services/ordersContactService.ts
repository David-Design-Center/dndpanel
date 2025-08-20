import { supabase } from '../lib/supabase';

interface InvoiceContact {
  id: string;
  customer_name: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  customer_tel1?: string;
  customer_tel2?: string;
  customer_email?: string;
  po_number?: string;
  created_at: string;
}

interface Contact {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tel1: string;
  tel2: string;
  email: string;
  contributors: {
    name: string;
    initials: string;
  }[];
  orderNumbers: string[];
}

/**
 * Fetch all contacts from the invoices table
 * Consolidates duplicate contacts and aggregates invoice numbers and contributors
 */
export const fetchOrdersContacts = async (): Promise<Contact[]> => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        customer_name,
        customer_address,
        customer_city,
        customer_state,
        customer_zip,
        customer_tel1,
        customer_tel2,
        customer_email,
        po_number,
        created_at
      `)
      .not('customer_name', 'is', null)
      .not('customer_name', 'eq', '');

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    if (!invoices) {
      return [];
    }

    // Process and consolidate contacts
    const contactsMap = new Map<string, Contact>();

    invoices.forEach((invoice: InvoiceContact) => {
      // Use customer name as the unique key (case-insensitive)
      const contactKey = invoice.customer_name.toLowerCase().trim();
      
      if (contactsMap.has(contactKey)) {
        // Update existing contact
        const existingContact = contactsMap.get(contactKey)!;
        
        // Add PO number if it exists and isn't already included
        if (invoice.po_number && !existingContact.orderNumbers.includes(invoice.po_number)) {
          existingContact.orderNumbers.push(invoice.po_number);
        }
        
        // For invoices, we'll use a generic "System" contributor since created_by isn't available
        // In the future, you could add a created_by field to the invoices table
        const contributorName = "System User";
        const initials = getInitials(contributorName);
        
        if (!existingContact.contributors.some(c => c.name === contributorName)) {
          existingContact.contributors.push({
            name: contributorName,
            initials: initials
          });
        }
      } else {
        // Create new contact
        const newContact: Contact = {
          id: invoice.id,
          fullName: invoice.customer_name,
          address: invoice.customer_address || '',
          city: invoice.customer_city || '',
          state: invoice.customer_state || '',
          zip: invoice.customer_zip || '',
          tel1: invoice.customer_tel1 || '',
          tel2: invoice.customer_tel2 || '',
          email: invoice.customer_email || '',
          contributors: [{
            name: "System User",
            initials: getInitials("System User")
          }],
          orderNumbers: invoice.po_number ? [invoice.po_number] : []
        };
        
        contactsMap.set(contactKey, newContact);
      }
    });

    // Convert map to array and sort by full name
    const contacts = Array.from(contactsMap.values()).sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );

    return contacts;
  } catch (error) {
    console.error('Error in fetchOrdersContacts:', error);
    throw error;
  }
};

/**
 * Generate initials from a full name
 */
function getInitials(name: string): string {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2) // Take only first 2 initials
    .join('');
}

/**
 * Search contacts by name, email, or PO number
 */
export const searchOrdersContacts = async (query: string): Promise<Contact[]> => {
  const allContacts = await fetchOrdersContacts();
  
  if (!query.trim()) {
    return allContacts;
  }
  
  const searchTerm = query.toLowerCase();
  
  return allContacts.filter(contact => 
    contact.fullName.toLowerCase().includes(searchTerm) ||
    contact.email.toLowerCase().includes(searchTerm) ||
    contact.city.toLowerCase().includes(searchTerm) ||
    contact.orderNumbers.some(poNumber => 
      poNumber.toLowerCase().includes(searchTerm)
    )
  );
};
