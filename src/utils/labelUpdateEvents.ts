/**
 * Event system for label unread count updates
 * This allows components to communicate when emails are read/unread
 */

export interface LabelUpdateEventDetail {
  labelIds: string[];
  action: 'mark-read' | 'mark-unread';
  threadId?: string;
  messageId: string;
}

export const LABEL_UPDATE_EVENT = 'label-unread-update';

/**
 * Emit an event when an email's read status changes
 */
export const emitLabelUpdateEvent = (detail: LabelUpdateEventDetail) => {
  const event = new CustomEvent(LABEL_UPDATE_EVENT, { detail });
  window.dispatchEvent(event);
  
  console.log('📬 LABEL UPDATE EVENT:', detail);
};

/**
 * Subscribe to label update events
 */
export const subscribeLabelUpdateEvent = (
  callback: (detail: LabelUpdateEventDetail) => void
) => {
  const handleEvent = (event: CustomEvent<LabelUpdateEventDetail>) => {
    callback(event.detail);
  };

  window.addEventListener(LABEL_UPDATE_EVENT, handleEvent as EventListener);
  
  return () => {
    window.removeEventListener(LABEL_UPDATE_EVENT, handleEvent as EventListener);
  };
};
