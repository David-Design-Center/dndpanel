/**
 * Gmail message mutation operations
 * Handles: mark as read/unread, starred, important, trash
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
 * Mark a Gmail message as trash
 */
export const markGmailMessageAsTrash = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Moving message ${messageId} to trash`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['TRASH'],
        removeLabelIds: ['INBOX']
      }
    });

    console.log(`Successfully moved message ${messageId} to trash`);
  } catch (error) {
    console.error('Error moving message to trash:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as read
 */
export const markGmailMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as read`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD']
      }
    });

    console.log(`Successfully marked message ${messageId} as read`);
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as unread
 */
export const markGmailMessageAsUnread = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as unread`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['UNREAD']
      }
    });

    console.log(`Successfully marked message ${messageId} as unread`);
  } catch (error) {
    console.error('Error marking message as unread:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as starred
 */
export const markGmailMessageAsStarred = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

  console.log(`Marking message ${messageId} as STARRED`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { addLabelIds: ['STARRED'] }
    });

    console.log(`Successfully marked message ${messageId} as STARRED`);
  } catch (error) {
    console.error('Error marking message as STARRED:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as unstarred
 */
export const markGmailMessageAsUnstarred = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

  console.log(`Marking message ${messageId} as UNSTARRED`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { removeLabelIds: ['STARRED'] }
    });

    console.log(`Successfully marked message ${messageId} as UNSTARRED`);
  } catch (error) {
    console.error('Error marking message as UNSTARRED:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as IMPORTANT
 */
export const markGmailMessageAsImportant = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }
    console.log(`Marking message ${messageId} as IMPORTANT`);
    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { addLabelIds: ['IMPORTANT'] }
    });
    console.log(`Successfully marked message ${messageId} as IMPORTANT`);
  } catch (error) {
    console.error('Error marking message as IMPORTANT:', error);
    throw error;
  }
};

/**
 * Remove IMPORTANT label
 */
export const markGmailMessageAsUnimportant = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }
    console.log(`Marking message ${messageId} as NOT IMPORTANT`);
    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { removeLabelIds: ['IMPORTANT'] }
    });
    console.log(`Successfully removed IMPORTANT from ${messageId}`);
  } catch (error) {
    console.error('Error removing IMPORTANT label:', error);
    throw error;
  }
};
