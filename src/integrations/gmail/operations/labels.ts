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
import { FEATURE_FLAGS } from "../../../config/server";

const LABEL_DETAIL_BATCH_SIZE = 50;
const LABEL_DETAIL_MIN_BATCH_SIZE = 15;
const LABEL_DETAIL_DELAY_MS = 200;
const LABEL_DETAIL_MAX_RETRIES = 3;
const LABEL_DETAIL_BACKOFF_MS = 350;
const LABEL_PROGRESS_LOG_INTERVAL_MS = 750;

// Batch size for progressive loading (increased from 5 to 10)
const PROGRESSIVE_BATCH_SIZE = 10;

const SYSTEM_LABELS_WITH_COUNTS = new Set([
  "INBOX",
  "SENT",
  "DRAFT",
  "TRASH",
  "SPAM",
  "STARRED",
  "IMPORTANT",
]);

// Priority order for system labels (fetched first)
const PRIORITY_SYSTEM_LABELS = ["INBOX", "DRAFT", "SENT", "TRASH", "SPAM", "STARRED", "IMPORTANT"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Progress callback type for progressive label loading
 */
export type LabelProgressCallback = (labels: GmailLabel[]) => void;

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
 * Fetch Gmail labels with optional progressive loading
 * 
 * When FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS is TRUE:
 *   - Fetches ALL labels (system + custom) via individual users.labels.get() calls
 *   - Logs detailed API responses to console for Google Support debugging
 *   - Supports progressive loading via onProgress callback
 *   - Priority: System labels first (INBOX, DRAFT, SENT), then custom labels
 * 
 * When FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS is FALSE:
 *   - Only fetches system labels with counts (original behavior)
 *   - Custom labels hydrate later via Supabase sync
 * 
 * @param onProgress - Optional callback invoked after each batch with cumulative labels
 */
export const fetchGmailLabels = async (
  onProgress?: LabelProgressCallback
): Promise<GmailLabel[]> => {
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

    // =========================================================================
    // DIAGNOSTIC MODE: Fetch ALL labels with progressive loading
    // Purpose: Google Support case - prove counters come directly from Gmail API
    // =========================================================================
    if (FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS) {
      console.log("═══════════════════════════════════════════════════════════════");
      console.log("🔬 DIAGNOSTIC MODE: Direct Gmail API Label Fetch (Progressive)");
      console.log("📅 Timestamp:", new Date().toISOString());
      console.log("📊 Total labels to fetch:", response.result.labels.length);
      console.log("═══════════════════════════════════════════════════════════════");

      const allLabels = response.result.labels;
      
      // ✅ PHASE 1: Immediately emit all labels with 0 counters
      const initialLabels: GmailLabel[] = allLabels.map((label: any) => ({
        id: label.id,
        name: label.name,
        messageListVisibility: label.messageListVisibility,
        labelListVisibility: label.labelListVisibility,
        type: label.type,
        messagesTotal: 0,
        messagesUnread: 0,
        threadsTotal: 0,
        threadsUnread: 0,
      }));
      
      // Emit initial labels immediately so UI shows folder structure
      if (onProgress) {
        console.log("📤 Emitting initial labels (0 counters):", initialLabels.length);
        onProgress(initialLabels);
      }
      
      // Track labels with loaded counters
      const labelDetailsMap = new Map<string, any>();
      const failedLabels: { labelName: string; labelId: string; error: unknown }[] = [];
      
      // ✅ PHASE 2: Fetch system labels FIRST (priority)
      const systemLabels = allLabels.filter((label: any) => 
        PRIORITY_SYSTEM_LABELS.includes(label.id)
      );
      const customLabels = allLabels.filter((label: any) => 
        !PRIORITY_SYSTEM_LABELS.includes(label.id)
      );
      
      // Order: system labels first, then custom
      const orderedLabels = [...systemLabels, ...customLabels];
      
      const totalBatches = Math.ceil(orderedLabels.length / PROGRESSIVE_BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * PROGRESSIVE_BATCH_SIZE;
        const batch = orderedLabels.slice(start, start + PROGRESSIVE_BATCH_SIZE);
        
        const isSystemBatch = batchIndex === 0 && systemLabels.length > 0;
        console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches} - Fetching ${batch.length} ${isSystemBatch ? 'SYSTEM' : 'custom'} labels...`);

        const batchResults = await Promise.all(
          batch.map(async (label: any) => {
            try {
              const detailResponse = await window.gapi.client.gmail.users.labels.get({
                userId: "me",
                id: label.id,
              });
              
              const result = detailResponse.result;
              
              // Log each label's API response in detail
              console.log(
                `📊 Label GET: "${result.name}" | ` +
                `id: ${result.id} | ` +
                `messagesTotal: ${result.messagesTotal ?? 0} | ` +
                `threadsTotal: ${result.threadsTotal ?? 0} | ` +
                `messagesUnread: ${result.messagesUnread ?? 0} | ` +
                `threadsUnread: ${result.threadsUnread ?? 0}`
              );
              
              return result;
            } catch (error: any) {
              console.error(`❌ Failed to fetch "${label.name}" (${label.id}):`, error?.message || error);
              failedLabels.push({ labelName: label.name, labelId: label.id, error });
              return null;
            }
          })
        );

        // Store successful results in map
        batchResults.forEach((result) => {
          if (result) {
            labelDetailsMap.set(result.id, result);
          }
        });

        // ✅ PROGRESSIVE UPDATE: Emit updated labels after each batch
        if (onProgress) {
          const progressLabels: GmailLabel[] = allLabels.map((label: any) => {
            const detail = labelDetailsMap.get(label.id);
            if (detail) {
              return {
                id: detail.id,
                name: detail.name,
                messageListVisibility: detail.messageListVisibility,
                labelListVisibility: detail.labelListVisibility,
                type: detail.type,
                messagesTotal: detail.messagesTotal || 0,
                messagesUnread: detail.messagesUnread || 0,
                threadsTotal: detail.threadsTotal || 0,
                threadsUnread: detail.threadsUnread || 0,
              };
            }
            // Label not yet loaded - return with 0 counters
            return {
              id: label.id,
              name: label.name,
              messageListVisibility: label.messageListVisibility,
              labelListVisibility: label.labelListVisibility,
              type: label.type,
              messagesTotal: 0,
              messagesUnread: 0,
              threadsTotal: 0,
              threadsUnread: 0,
            };
          });
          
          console.log(`📤 Progress update: ${labelDetailsMap.size}/${allLabels.length} labels have counters`);
          onProgress(progressLabels);
        }

        console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} complete`);

        // Small delay between batches to avoid rate limiting
        if (batchIndex < totalBatches - 1) {
          await sleep(200);
        }
      }

      // Summary table for easy copy-paste to Google Support
      console.log("\n═══════════════════════════════════════════════════════════════");
      console.log("📊 SUMMARY TABLE - All Labels with Counts");
      console.log("📅 Timestamp:", new Date().toISOString());
      console.log("───────────────────────────────────────────────────────────────");
      
      // Prepare final labels array
      const labelDetails = Array.from(labelDetailsMap.values());
      
      // Prepare data for console.table
      const tableData = labelDetails.map((label) => ({
        name: label.name,
        id: label.id,
        type: label.type || "user",
        messagesTotal: label.messagesTotal ?? 0,
        threadsTotal: label.threadsTotal ?? 0,
        messagesUnread: label.messagesUnread ?? 0,
        threadsUnread: label.threadsUnread ?? 0,
      }));
      
      console.table(tableData);
      
      console.log("───────────────────────────────────────────────────────────────");
      console.log(`✅ Successfully fetched: ${labelDetails.length}/${allLabels.length} labels`);
      if (failedLabels.length) {
        console.warn(`⚠️ Failed labels (${failedLabels.length}):`, failedLabels.map(f => f.labelName));
      }
      console.log("═══════════════════════════════════════════════════════════════");
      console.log("ℹ️ NOTE: threadsUnread ≠ messagesUnread is expected behavior.");
      console.log("   Gmail Inbox uses threads. Custom labels may use messages.");
      console.log("═══════════════════════════════════════════════════════════════\n");

      // Final labels - merge loaded details with any that failed (with 0 counters)
      const labels: GmailLabel[] = allLabels.map((label: any) => {
        const detail = labelDetailsMap.get(label.id);
        if (detail) {
          return {
            id: detail.id,
            name: detail.name,
            messageListVisibility: detail.messageListVisibility,
            labelListVisibility: detail.labelListVisibility,
            type: detail.type,
            messagesTotal: detail.messagesTotal || 0,
            messagesUnread: detail.messagesUnread || 0,
            threadsTotal: detail.threadsTotal || 0,
            threadsUnread: detail.threadsUnread || 0,
          };
        }
        // Label failed to load - return with 0 counters
        return {
          id: label.id,
          name: label.name,
          messageListVisibility: label.messageListVisibility,
          labelListVisibility: label.labelListVisibility,
          type: label.type,
          messagesTotal: 0,
          messagesUnread: 0,
          threadsTotal: 0,
          threadsUnread: 0,
        };
      });

      return labels;
    }

    // =========================================================================
    // PRODUCTION MODE: Original behavior - only fetch system labels
    // =========================================================================
    
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