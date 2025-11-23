/**
 * Gmail labels and filtering operations
 */

import { GmailLabel } from '../../../types';
import type { PaginatedEmailResponse } from '../fetch/messages';
import { fetchGmailMessages } from '../fetch/messages';
import { queueGmailRequest, getGmailQueueStatus } from '../../../utils/requestQueue';

const LABEL_DETAIL_BATCH_SIZE = 50;
const LABEL_DETAIL_MIN_BATCH_SIZE = 15;
const LABEL_DETAIL_DELAY_MS = 200;
const LABEL_DETAIL_MAX_RETRIES = 3;
const LABEL_DETAIL_BACKOFF_MS = 350;
const LABEL_PROGRESS_LOG_INTERVAL_MS = 750;

const SYSTEM_LABELS_WITH_COUNTS = new Set([
  'INBOX',
  'SENT',
  'DRAFT',
  'TRASH',
  'SPAM',
  'STARRED',
  'IMPORTANT'
]);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Fetch Gmail labels
 */
export const fetchGmailLabels = async (): Promise<GmailLabel[]> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Fetching Gmail labels...');

    const response = await window.gapi.client.gmail.users.labels.list({
      userId: 'me'
    });

    if (!response.result || !response.result.labels) {
      console.warn('No labels found in Gmail account');
      return [];
    }

    console.log(' Raw Gmail API response from list:', response.result);
    console.log(`Found ${response.result.labels.length} labels, now fetching details with counters...`);

    // Fetch details for SYSTEM labels only (custom labels hydrate later in background)
    const labelsToFetchDetails = response.result.labels.filter((label: any) => {
      return SYSTEM_LABELS_WITH_COUNTS.has(label.id);
    });

    console.log(` Fetching detailed info for ${labelsToFetchDetails.length} system labels (custom labels stay cached until manual refresh)`);

    const labelDetails = [...response.result.labels];
    const failedLabels: { labelName: string; labelId: string; error: unknown }[] = [];
    let completed = 0;
    let failed = 0;
    let nextProgressLogAt = 0;

    const logProgress = (force = false) => {
      const now = Date.now();
      if (!force && now < nextProgressLogAt) {
        return;
      }
      nextProgressLogAt = now + LABEL_PROGRESS_LOG_INTERVAL_MS;
      console.log(
        `📦 Label detail progress: ${completed}/${labelsToFetchDetails.length} succeeded (${failed} failed)`
      );
    };

    const fetchDetailWithRetry = async (label: any, attempt = 0): Promise<any | null> => {
      try {
        const detailResponse = await queueGmailRequest(
          `label-detail-${label.id}`,
          () => window.gapi.client.gmail.users.labels.get({
            userId: 'me',
            id: label.id
          })
        );
        return detailResponse.result;
      } catch (error: any) {
        const status = error?.status || error?.result?.error?.code;
        if (status === 429 && attempt < LABEL_DETAIL_MAX_RETRIES) {
          const backoff = LABEL_DETAIL_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(`⚠️ Rate limited fetching ${label.name}. Retrying in ${backoff}ms (attempt ${attempt + 1})`);
          await sleep(backoff);
          return fetchDetailWithRetry(label, attempt + 1);
        }
        failedLabels.push({ labelName: label.name, labelId: label.id, error });
        failed += 1;
        logProgress(true);
        return null;
      }
    };

    const processLabelGroup = async (group: any[], labelGroupName: string) => {
      if (!group.length) {
        return;
      }

      console.log(`📂 Hydrating ${group.length} ${labelGroupName} labels...`);
      for (let start = 0; start < group.length; ) {
        const queueStatus = getGmailQueueStatus();
        const adaptiveBatchSize = Math.max(
          LABEL_DETAIL_MIN_BATCH_SIZE,
          queueStatus.activeRequests > 2 ? Math.floor(LABEL_DETAIL_BATCH_SIZE / 2) : LABEL_DETAIL_BATCH_SIZE
        );

        const batch = group.slice(start, start + adaptiveBatchSize);
        const batchResults = await Promise.all(batch.map(label => fetchDetailWithRetry(label)));

        batchResults.forEach((detail, index) => {
          const original = batch[index];
          if (!detail || !original?.id) {
            return;
          }
          const labelIndex = labelDetails.findIndex(l => l.id === original.id);
          if (labelIndex !== -1) {
            labelDetails[labelIndex] = detail;
          }
          completed += 1;
        });

        start += adaptiveBatchSize;
        logProgress(true);

        if (start < group.length) {
          await sleep(LABEL_DETAIL_DELAY_MS);
        }
      }
    };

    const systemLabelDetails = labelsToFetchDetails.filter(label => SYSTEM_LABELS_WITH_COUNTS.has(label.id));

    await processLabelGroup(systemLabelDetails, 'system');

    logProgress(true);
    console.log(
      ` ✓ Completed label detail fetch: ${completed}/${labelsToFetchDetails.length} succeeded (${failed} failed)`
    );
    if (failedLabels.length) {
      console.warn('⚠️ Labels missing counters due to rate limits (showing up to 10):',
        failedLabels.slice(0, 10).map(f => f.labelName)
      );
    }

    console.log(' Raw label details with counters:', labelDetails);

    const labels: GmailLabel[] = labelDetails.map((label: any) => ({
      id: label.id,
      name: label.name,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      type: label.type,
      messagesTotal: label.messagesTotal || 0,
      messagesUnread: label.messagesUnread || 0,
      threadsTotal: label.threadsTotal || 0,
      threadsUnread: label.threadsUnread || 0
    }));

    const labelsWithCounts = labels.filter(label => 
      (label.messagesTotal || 0) > 0 || (label.messagesUnread || 0) > 0
    );

    console.log(`Found ${labelsWithCounts.length} labels with message counts`);

    const keyLabels = ['INBOX', 'SENT', 'DRAFT'].map(name => labels.find(l => l.name === name)).filter(Boolean);
    console.log('KEY SYSTEM LABELS:', keyLabels.map(label => ({
      name: label?.name,
      total: label?.messagesTotal,
      unread: label?.messagesUnread
    })));

    console.log(`Successfully fetched ${labels.length} Gmail labels`);
    return labels;

  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw error;
  }
};

/**
 * Fetch emails by label
 */
export const fetchGmailMessagesByLabel = async (
  labelId: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const query = `label:${labelId}`;
    
    console.log(`Fetching Gmail messages for label: ${labelId}`);
    
    return await fetchGmailMessages(query, maxResults, pageToken);

  } catch (error) {
    console.error(`Error fetching Gmail messages by label (${labelId}):`, error);
    throw error;
  }
};

/**
 * Create a new Gmail label
 */
export const createGmailLabel = async (name: string): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Creating Gmail label: ${name}`);

    const response = await window.gapi.client.gmail.users.labels.create({
      userId: 'me',
      resource: {
        name: name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });

    if (!response.result) {
      throw new Error('Failed to create label');
    }

    const newLabel: GmailLabel = {
      id: response.result.id,
      name: response.result.name,
      messageListVisibility: response.result.messageListVisibility,
      labelListVisibility: response.result.labelListVisibility,
      type: response.result.type,
      messagesTotal: response.result.messagesTotal,
      messagesUnread: response.result.messagesUnread,
      threadsTotal: response.result.threadsTotal,
      threadsUnread: response.result.threadsUnread
    };

    console.log(`Successfully created Gmail label: ${name}`);
    return newLabel;

  } catch (error) {
    console.error('Error creating Gmail label:', error);
    throw error;
  }
};

/**
 * Update an existing Gmail label
 */
export const updateGmailLabel = async (id: string, newName: string): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Updating Gmail label ${id} to: ${newName}`);

    const response = await window.gapi.client.gmail.users.labels.update({
      userId: 'me',
      id: id,
      resource: {
        id: id,
        name: newName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });

    if (!response.result) {
      throw new Error('Failed to update label');
    }

    const updatedLabel: GmailLabel = {
      id: response.result.id,
      name: response.result.name,
      messageListVisibility: response.result.messageListVisibility,
      labelListVisibility: response.result.labelListVisibility,
      type: response.result.type,
      messagesTotal: response.result.messagesTotal,
      messagesUnread: response.result.messagesUnread,
      threadsTotal: response.result.threadsTotal,
      threadsUnread: response.result.threadsUnread
    };

    console.log(`Successfully updated Gmail label: ${newName}`);
    return updatedLabel;

  } catch (error) {
    console.error('Error updating Gmail label:', error);
    throw error;
  }
};

/**
 * Delete a Gmail label
 */
export const deleteGmailLabel = async (id: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    // Prevent deletion of system labels
    const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT', 'UNREAD'];
    if (systemLabels.includes(id)) {
      throw new Error('Cannot delete system labels');
    }

    console.log(`Attempting to delete Gmail label with ID: ${id}`);

    const response = await window.gapi.client.gmail.users.labels.delete({
      userId: 'me',
      id: id
    });

    console.log(`Gmail API delete response:`, response);
    console.log(`Successfully deleted Gmail label: ${id}`);

  } catch (error) {
    console.error('Error deleting Gmail label:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Apply labels to a Gmail message
 */
export const applyGmailLabels = async (
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Applying labels to message ${messageId}:`, { addLabelIds, removeLabelIds });

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds,
        removeLabelIds
      }
    });

    console.log(`Successfully applied labels to message ${messageId}`);
  } catch (error) {
    console.error('Error applying labels to Gmail message:', error);
    throw error;
  }
};
