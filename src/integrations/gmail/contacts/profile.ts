/**
 * Gmail contacts and profile operations
 * Handles: user profile, People API connections and contacts
 */

/**
 * Check if Gmail is signed in
 */
const isGmailSignedIn = (): boolean => {
  try {
    return window.gapi?.client?.gmail !== undefined;
  } catch {
    return false;
  }
};

/**
 * Get Gmail user profile information
 */
export const getGmailUserProfile = async (): Promise<{ name: string; email: string; picture?: string } | null> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Fetching Gmail user profile...');
    
    // Use the Gmail API to get user's profile (which includes email address)
    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
    });

    if (!response.result) {
      throw new Error('No profile data returned from Gmail API');
    }

    // Get the email address from the profile
    const emailAddress = response.result.emailAddress;
    
    // For now, we'll extract name from email or use email as name
    // In a real app, you might want to use Google People API for more detailed profile info
    let name = emailAddress;
    if (emailAddress) {
      // Try to extract name from email (e.g., "john.doe@gmail.com" -> "John Doe")
      const localPart = emailAddress.split('@')[0];
      name = localPart.split(/[._]/).map((part: string) => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }

    console.log('Gmail user profile fetched:', { name, email: emailAddress });
    
    return {
      name: name,
      email: emailAddress || '',
      picture: undefined // Gmail API doesn't provide profile pictures directly
    };

  } catch (error) {
    console.error('Error fetching Gmail user profile:', error);
    return null;
  }
};

/**
 * Test function to verify People API connectivity
 * Can be called from browser console: window.testPeopleAPI()
 */
export const testPeopleAPI = async (): Promise<void> => {
  console.log('=== Testing People API ===');
  
  try {
    // Check basic authentication
    console.log('1. Checking Gmail sign-in status:', isGmailSignedIn());
    
    if (!isGmailSignedIn()) {
      console.error('Not signed in to Gmail - cannot test People API');
      return;
    }
    
    // Check if gapi is available
    console.log('2. Checking gapi availability:', !!window.gapi);
    console.log('3. Checking gapi.client availability:', !!window.gapi?.client);
    
    // List all available APIs
    console.log('4. Available APIs:', Object.keys(window.gapi?.client || {}));
    
    // Check if People API is available
    console.log('5. Checking People API availability:', !!window.gapi?.client?.people);
    
    if (window.gapi?.client?.people) {
      console.log('6. People API object:', window.gapi.client.people);
      console.log('7. People connections method available:', 
        !!window.gapi.client.people.people?.connections?.list);
    }
    
    // Test People API calls
    console.log('8. Testing fetchPeopleConnections...');
    const peopleConnections = await fetchPeopleConnections();
    console.log('9. People connections result:', peopleConnections);
    
    console.log('10. Testing fetchOtherContacts...');
    const otherContacts = await fetchOtherContacts();
    console.log('11. Other contacts result:', otherContacts);
    
    console.log('=== People API Test Complete ===');
    console.log(`Results: ${peopleConnections.length} people connections, ${otherContacts.length} other contacts`);
    
  } catch (error) {
    console.error('=== People API Test Failed ===');
    console.error('Error:', error);
  }
};

/**
 * Fetch frequently contacted people and my contacts from Google People API
 */
export const fetchPeopleConnections = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      console.warn('fetchPeopleConnections: Not signed in to Gmail');
      throw new Error('Not signed in to Gmail');
    }

    console.log('fetchPeopleConnections: Starting to fetch...');
    console.log('fetchPeopleConnections: gapi.client available:', !!window.gapi?.client);
    console.log('fetchPeopleConnections: people API available:', !!window.gapi?.client?.people);

    // Check if People API is available
    if (!window.gapi?.client?.people) {
      console.warn('fetchPeopleConnections: People API not available - checking what is available');
      console.log('Available APIs:', Object.keys(window.gapi?.client || {}));
      return [];
    }

    console.log('fetchPeopleConnections: Calling People API...');
    
    const response = await window.gapi.client.people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      sortOrder: 'LAST_MODIFIED_DESCENDING',
      personFields: 'names,emailAddresses,photos,metadata'
    });

    console.log('fetchPeopleConnections: API response received:', response);
    const connections = response.result?.connections || [];
    console.log(`fetchPeopleConnections: Found ${connections.length} connections`);
    
    return connections;
  } catch (error) {
    console.error('fetchPeopleConnections: Error fetching people connections:', error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Fetch other contacts from Google People API
 */
export const fetchOtherContacts = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      console.warn('fetchOtherContacts: Not signed in to Gmail');
      throw new Error('Not signed in to Gmail');
    }

    console.log('fetchOtherContacts: Starting to fetch...');
    
    const response = await window.gapi.client.request({
      path: 'https://people.googleapis.com/v1/otherContacts',
      params: {
        readMask: 'names,emailAddresses,photos',
        pageSize: 1000
      }
    });

    console.log('fetchOtherContacts: API response received:', response);
    const otherContacts = response.result.otherContacts || [];
    console.log(`fetchOtherContacts: Found ${otherContacts.length} other contacts`);

    return otherContacts;
  } catch (error) {
    console.error('fetchOtherContacts: Error fetching other contacts:', error);
    if (error instanceof Error) {
      console.error('fetchOtherContacts: Error details:', {
        message: error.message,
        status: (error as any).status,
        details: (error as any).result
      });
    }
    return []; // Return empty array instead of throwing for this function too
  }
};
