/**
 * Gmail labels and filtering operations
 */

import { GmailLabel } from "../../../types";
import type { PaginatedEmailResponse } from "../fetch/messages";
import { fetchGmailMessages } from "../fetch/messages";
import {
  queueGmailRequest,
  getGmailQueueStatus,
} from "../../../utils/requestQueue";

const LABEL_DETAIL_BATCH_SIZE = 50;
const LABEL_DETAIL_MIN_BATCH_SIZE = 15;
const LABEL_DETAIL_DELAY_MS = 200;
const LABEL_DETAIL_MAX_RETRIES = 3;
const LABEL_DETAIL_BACKOFF_MS = 350;
const LABEL_PROGRESS_LOG_INTERVAL_MS = 750;

const SYSTEM_LABELS_WITH_COUNTS = new Set([
  "INBOX",
  "SENT",
  "DRAFT",
  "TRASH",
  "SPAM",
  "STARRED",
  "IMPORTANT",
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      throw new Error("Not signed in to Gmail");
    }

    const response = await window.gapi.client.gmail.users.labels.list({
      userId: "me",
    });

    if (!response.result || !response.result.labels) {
      console.warn("No labels found in Gmail account");
      return [];
    }

    // Fetch details for SYSTEM labels only (custom labels hydrate later in background)
    const labelsToFetchDetails = response.result.labels.filter((label: any) => {
      return SYSTEM_LABELS_WITH_COUNTS.has(label.id);
    });

    const labelDetails = [...response.result.labels];
    const failedLabels: {
      labelName: string;
      labelId: string;
      error: unknown;
    }[] = [];
    let completed = 0;
    let failed = 0;
    let nextProgressLogAt = 0;

    const logProgress = (force = false) => {
      const now = Date.now();
      if (!force && now < nextProgressLogAt) {
        return;
      }
      nextProgressLogAt = now + LABEL_PROGRESS_LOG_INTERVAL_MS;
    };

    const fetchDetailWithRetry = async (
      label: any,
      attempt = 0
    ): Promise<any | null> => {
      try {
        const detailResponse = await queueGmailRequest(
          `label-detail-${label.id}`,
          () =>
            window.gapi.client.gmail.users.labels.get({
              userId: "me",
              id: label.id,
            })
        );
        return detailResponse.result;
      } catch (error: any) {
        const status = error?.status || error?.result?.error?.code;
        if (status === 429 && attempt < LABEL_DETAIL_MAX_RETRIES) {
          const backoff = LABEL_DETAIL_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(
            `⚠️ Rate limited fetching ${
              label.name
            }. Retrying in ${backoff}ms (attempt ${attempt + 1})`
          );
          await sleep(backoff);
          return fetchDetailWithRetry(label, attempt + 1);
        }
        failedLabels.push({ labelName: label.name, labelId: label.id, error });
        failed += 1;
        logProgress(true);
        return null;
      }
    };

    const processLabelGroup = async (group: any[], _labelGroupName: string) => {
      if (!group.length) {
        return;
      }
      for (let start = 0; start < group.length; ) {
        const queueStatus = getGmailQueueStatus();
        const adaptiveBatchSize = Math.max(
          LABEL_DETAIL_MIN_BATCH_SIZE,
          queueStatus.activeRequests > 2
            ? Math.floor(LABEL_DETAIL_BATCH_SIZE / 2)
            : LABEL_DETAIL_BATCH_SIZE
        );

        const batch = group.slice(start, start + adaptiveBatchSize);
        const batchResults = await Promise.all(
          batch.map((label) => fetchDetailWithRetry(label))
        );

        batchResults.forEach((detail, index) => {
          const original = batch[index];
          if (!detail || !original?.id) {
            return;
          }
          const labelIndex = labelDetails.findIndex(
            (l) => l.id === original.id
          );
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

    const systemLabelDetails = labelsToFetchDetails.filter((label: any) =>
      SYSTEM_LABELS_WITH_COUNTS.has(label.id)
    );

    await processLabelGroup(systemLabelDetails, "system");

    logProgress(true);
    if (failedLabels.length) {
      console.warn(
        "⚠️ Labels missing counters due to rate limits (showing up to 10):",
        failedLabels.slice(0, 10).map((f) => f.labelName)
      );
    }

    console.log(" Raw label details with counters:", labelDetails);

    const labels: GmailLabel[] = labelDetails.map((label: any) => ({
      id: label.id,
      name: label.name,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      type: label.type,
      messagesTotal: label.messagesTotal || 0,
      messagesUnread: label.messagesUnread || 0,
      threadsTotal: label.threadsTotal || 0,
      threadsUnread: label.threadsUnread || 0,
    }));

    return labels;
  } catch (error) {
    console.error("Error fetching Gmail labels:", error);
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
      throw new Error("Not signed in to Gmail");
    }

    const query = `label:${labelId}`;

    return await fetchGmailMessages(query, maxResults, pageToken);
  } catch (error) {
    console.error(
      `Error fetching Gmail messages by label (${labelId}):`,
      error
    );
    throw error;
  }
};

/**
 * Create a new Gmail label
 */
export const createGmailLabel = async (name: string): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error("Not signed in to Gmail");
    }

    const response = await window.gapi.client.gmail.users.labels.create({
      userId: "me",
      resource: {
        name: name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    });

    if (!response.result) {
      throw new Error("Failed to create label");
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
      threadsUnread: response.result.threadsUnread,
    };

    return newLabel;
  } catch (error) {
    console.error("Error creating Gmail label:", error);
    throw error;
  }
};

/**
 * Update an existing Gmail label
 */
export const updateGmailLabel = async (
  id: string,
  newName: string
): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error("Not signed in to Gmail");
    }

    const response = await window.gapi.client.gmail.users.labels.update({
      userId: "me",
      id: id,
      resource: {
        id: id,
        name: newName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
    });

    if (!response.result) {
      throw new Error("Failed to update label");
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
      threadsUnread: response.result.threadsUnread,
    };

    return updatedLabel;
  } catch (error) {
    console.error("Error updating Gmail label:", error);
    throw error;
  }
};

/**
 * Delete a Gmail label
 */
export const deleteGmailLabel = async (id: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error("Not signed in to Gmail");
    }

    // Prevent deletion of system labels
    const systemLabels = [
      "INBOX",
      "SENT",
      "DRAFT",
      "SPAM",
      "TRASH",
      "STARRED",
      "IMPORTANT",
      "UNREAD",
    ];
    if (systemLabels.includes(id)) {
      throw new Error("Cannot delete system labels");
    }

    await window.gapi.client.gmail.users.labels.delete({
      userId: "me",
      id: id,
    });
  } catch (error) {
    console.error("Error deleting Gmail label:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
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
      throw new Error("Not signed in to Gmail");
    }

    await window.gapi.client.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      resource: {
        addLabelIds,
        removeLabelIds,
      },
    });
  } catch (error) {
    console.error("Error applying labels to Gmail message:", error);
    throw error;
  }
};

/**
 * Batch apply labels to multiple messages at once
 * Uses Gmail's batchModify API - supports up to 1000 message IDs per request
 */
export const batchApplyGmailLabels = async (
  messageIds: string[],
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error("Not signed in to Gmail");
    }

    if (messageIds.length === 0) {
      return;
    }

    // Gmail API limit is 1000 IDs per request
    const BATCH_SIZE = 1000;
    const batches = [];
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      batches.push(messageIds.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // @ts-ignore - batchModify exists in Gmail API but not in gapi type definitions
      await window.gapi.client.gmail.users.messages.batchModify({
        userId: "me",
        resource: {
          ids: batch,
          addLabelIds,
          removeLabelIds,
        },
      });
    }
  } catch (error) {
    console.error("Error batch applying labels to Gmail messages:", error);
    throw error;
  }
};