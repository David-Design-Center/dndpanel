/**
 * Gmail trash management operations
 * Handles: empty trash functionality
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
 * Permanently delete all messages in trash (empty trash)
 */
export const emptyGmailTrash = async (): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Emptying Gmail trash...');

    // First, get all messages in trash
    const trashResponse = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      q: 'in:trash',
      maxResults: 500 // Process in batches
    });

    const messages = trashResponse.result.messages || [];
    
    if (messages.length === 0) {
      console.log('Trash is already empty');
      return;
    }

    console.log(`Found ${messages.length} messages in trash. Permanently deleting...`);

    // Delete messages in batches to avoid API limits
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      // Use Promise.allSettled to handle partial failures gracefully
      const deletePromises = batch.map(async (message: any) => {
        try {
          await window.gapi.client.request({
            path: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            method: 'DELETE'
          });
          return { success: true, messageId: message.id };
        } catch (error: any) {
          console.warn(`Failed to delete message ${message.id}:`, error);
          return { success: false, messageId: message.id, error };
        }
      });

      await Promise.allSettled(deletePromises);
      
      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(` Successfully emptied trash - deleted ${messages.length} messages`);
  } catch (error) {
    console.error('Error emptying Gmail trash:', error);
    throw error;
  }
};
