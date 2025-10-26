/**
 * Gmail filter management operations
 * Handles: list, get, create, delete filters
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
 * List all Gmail filters
 */
export const listGmailFilters = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/settings/filters'
    });

    return response.result.filter || [];
  } catch (error) {
    console.error('Error listing Gmail filters:', error);
    throw error;
  }
};

/**
 * Get a specific Gmail filter
 */
export const getGmailFilter = async (filterId: string): Promise<any> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filterId}`
    });

    return response.result;
  } catch (error) {
    console.error('Error getting Gmail filter:', error);
    throw error;
  }
};

/**
 * Create a new Gmail filter
 */
export const createGmailFilter = async (criteria: any, action: any): Promise<any> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/settings/filters',
      method: 'POST',
      body: {
        criteria,
        action
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error creating Gmail filter:', error);
    throw error;
  }
};

/**
 * Delete a Gmail filter
 */
export const deleteGmailFilter = async (filterId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    await window.gapi.client.request({
      path: `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filterId}`,
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting Gmail filter:', error);
    throw error;
  }
};
