import { Contact } from '../types';
import { fetchPeopleConnections, fetchOtherContacts } from '../integrations/gapiService';

/**
 * Service for managing contacts from Google People API
 */
export class ContactService {
  private static instance: ContactService;
  private contacts: Contact[] = [];
  private isLoaded = false;

  static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  /**
   * Load and process all contacts from Google People API
   */
  async loadContacts(): Promise<Contact[]> {
    if (this.isLoaded) {
      console.log('ContactService: Contacts already loaded, returning cached data');
      return this.contacts;
    }

    try {
      console.log('ContactService: Loading contacts from Google People API...');
      
      // Fetch both types of contacts
      const [peopleConnections, otherContacts] = await Promise.all([
        fetchPeopleConnections().catch(err => {
          console.warn('ContactService: Failed to fetch people connections:', err);
          return [];
        }),
        fetchOtherContacts().catch(err => {
          console.warn('ContactService: Failed to fetch other contacts:', err);
          return [];
        })
      ]);

      console.log(`ContactService: Raw data - people connections: ${peopleConnections.length}, other contacts: ${otherContacts.length}`);

      // Process and combine contacts
      const combinedContacts = this.processContacts(peopleConnections, otherContacts);
      
      this.contacts = combinedContacts;
      this.isLoaded = true;
      
      console.log(`ContactService: Successfully loaded ${combinedContacts.length} total contacts`);
      return combinedContacts;
    } catch (error) {
      console.error('ContactService: Error loading contacts:', error);
      this.contacts = [];
      this.isLoaded = false;
      throw error;
    }
  }

  /**
   * Process and combine contacts from different sources
   */
  private processContacts(peopleConnections: any[], otherContacts: any[]): Contact[] {
    const contactMap = new Map<string, Contact>();

    // Process people connections first (higher priority - frequently contacted)
    peopleConnections.forEach(person => {
      if (person.emailAddresses && person.emailAddresses.length > 0) {
        const email = person.emailAddresses[0].value.toLowerCase();
        const name = this.extractName(person, email);
        const photoUrl = this.extractPhotoUrl(person);
        
        // Check if this is frequently contacted
        const isFrequentlyContacted = this.isFrequentlyContacted(person);

        contactMap.set(email, {
          name,
          email,
          isFrequentlyContacted,
          photoUrl
        });
      }
    });

    // Process other contacts (lower priority)
    otherContacts.forEach(person => {
      if (person.emailAddresses && person.emailAddresses.length > 0) {
        const email = person.emailAddresses[0].value.toLowerCase();
        
        // Only add if not already present from people connections
        if (!contactMap.has(email)) {
          const name = this.extractName(person, email);
          const photoUrl = this.extractPhotoUrl(person);

          contactMap.set(email, {
            name,
            email,
            isFrequentlyContacted: false,
            photoUrl
          });
        }
      }
    });

    // Convert to array and sort by priority
    return Array.from(contactMap.values()).sort((a, b) => {
      // Frequently contacted first
      if (a.isFrequentlyContacted && !b.isFrequentlyContacted) return -1;
      if (!a.isFrequentlyContacted && b.isFrequentlyContacted) return 1;
      
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Extract name from person object, fallback to email
   */
  private extractName(person: any, email: string): string {
    if (person.names && person.names.length > 0) {
      return person.names[0].displayName || person.names[0].givenName || email;
    }
    
    // Extract name from email as fallback
    const localPart = email.split('@')[0];
    return localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  /**
   * Extract photo URL from person object
   */
  private extractPhotoUrl(person: any): string | undefined {
    if (person.photos && person.photos.length > 0) {
      return person.photos[0].url;
    }
    return undefined;
  }

  /**
   * Determine if a person is frequently contacted
   */
  private isFrequentlyContacted(person: any): boolean {
    // Check metadata for interaction frequency indicators
    if (person.metadata && person.metadata.sources) {
      return person.metadata.sources.some((source: any) => 
        source.type === 'CONTACT' || source.type === 'PROFILE'
      );
    }
    return false;
  }

  /**
   * Filter contacts based on search query
   */
  filterContacts(query: string, limit: number = 5): Contact[] {
    if (!query.trim()) {
      return this.contacts.slice(0, limit);
    }

    const searchQuery = query.toLowerCase();
    
    const filtered = this.contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery) ||
      contact.email.toLowerCase().includes(searchQuery)
    );

    // Sort by relevance: exact matches first, then starts with, then contains
    const sorted = filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const aEmail = a.email.toLowerCase();
      const bName = b.name.toLowerCase();
      const bEmail = b.email.toLowerCase();

      // Exact email match
      if (aEmail === searchQuery && bEmail !== searchQuery) return -1;
      if (bEmail === searchQuery && aEmail !== searchQuery) return 1;

      // Email starts with query
      if (aEmail.startsWith(searchQuery) && !bEmail.startsWith(searchQuery)) return -1;
      if (bEmail.startsWith(searchQuery) && !aEmail.startsWith(searchQuery)) return 1;

      // Name starts with query
      if (aName.startsWith(searchQuery) && !bName.startsWith(searchQuery)) return -1;
      if (bName.startsWith(searchQuery) && !aName.startsWith(searchQuery)) return 1;

      // Frequently contacted priority
      if (a.isFrequentlyContacted && !b.isFrequentlyContacted) return -1;
      if (!a.isFrequentlyContacted && b.isFrequentlyContacted) return 1;

      // Alphabetical fallback
      return aName.localeCompare(bName);
    });

    return sorted.slice(0, limit);
  }

  /**
   * Get all loaded contacts
   */
  getContacts(): Contact[] {
    return this.contacts;
  }

  /**
   * Check if contacts are already loaded
   */
  isContactsLoaded(): boolean {
    return this.isLoaded && this.contacts.length > 0;
  }

  /**
   * Clear loaded contacts (useful for refresh)
   */
  clearContacts(): void {
    this.contacts = [];
    this.isLoaded = false;
  }
}

export const contactService = ContactService.getInstance();
