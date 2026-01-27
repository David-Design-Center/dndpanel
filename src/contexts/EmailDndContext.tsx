import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { Email } from '../types';

interface EmailDndContextType {
  // Dragged email state
  activeEmail: Email | null;
  draggedEmailIds: string[];
  dragCount: number;
  
  // Drop target state
  overFolderId: string | null;
  
  // Source folder state - for contextual move
  sourceLabelId: string | null;
  sourcePageType: string | null;
  
  // Actions
  setDraggedEmails: (emails: Email[], selectedIds: Set<string>) => void;
  
  // Event handlers for EmailPageLayout to register
  registerEmailSource: (
    getEmails: () => Email[], 
    getSelectedIds: () => Set<string>,
    getSourceInfo: () => { labelId: string | null; pageType: string }
  ) => void;
}

const EmailDndContext = createContext<EmailDndContextType | undefined>(undefined);

export function useEmailDnd() {
  const context = useContext(EmailDndContext);
  if (context === undefined) {
    throw new Error('useEmailDnd must be used within an EmailDndProvider');
  }
  return context;
}

interface EmailDndProviderProps {
  children: ReactNode;
  onDropOnFolder?: (
    emailIds: string[], 
    folderId: string, 
    folderName: string, 
    unreadCount: number, 
    emails: Email[],
    sourceInfo: { labelId: string | null; pageType: string | null }
  ) => Promise<void>;
}

export function EmailDndProvider({ children, onDropOnFolder }: EmailDndProviderProps) {
  // Drag state
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [draggedEmailIds, setDraggedEmailIds] = useState<string[]>([]);
  const [draggedEmails, setDraggedEmailsState] = useState<Email[]>([]); // Full email objects for filter creation
  const [draggedUnreadCount, setDraggedUnreadCount] = useState<number>(0); // Track unread emails being dragged
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  
  // Source folder tracking for contextual move
  const [sourceLabelId, setSourceLabelId] = useState<string | null>(null);
  const [sourcePageType, setSourcePageType] = useState<string | null>(null);
  
  // Registered getters from EmailPageLayout
  const [emailSourceGetters, setEmailSourceGetters] = useState<{
    getEmails: () => Email[];
    getSelectedIds: () => Set<string>;
    getSourceInfo: () => { labelId: string | null; pageType: string };
  } | null>(null);

  // DnD Sensors - allow both horizontal and vertical movement
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const dragCount = draggedEmailIds.length;

  const registerEmailSource = useCallback((
    getEmails: () => Email[],
    getSelectedIds: () => Set<string>,
    getSourceInfo: () => { labelId: string | null; pageType: string }
  ) => {
    setEmailSourceGetters({ getEmails, getSelectedIds, getSourceInfo });
  }, []);

  const setDraggedEmails = useCallback((_emails: Email[], _selectedIds: Set<string>) => {
    // Not used directly, but keeping for potential future use
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const emailId = active.id as string;
    
    if (!emailSourceGetters) {
      console.warn('📦 DnD: No email source registered');
      return;
    }
    
    const emails = emailSourceGetters.getEmails();
    const selectedIds = emailSourceGetters.getSelectedIds();
    const sourceInfo = emailSourceGetters.getSourceInfo();
    
    // Capture source folder info for contextual move
    setSourceLabelId(sourceInfo.labelId);
    setSourcePageType(sourceInfo.pageType);
    
    // Find the dragged email
    const email = emails.find(e => e.id === emailId);
    if (!email) {
      console.warn('📦 DnD: Email not found in source');
      return;
    }
    
    setActiveEmail(email);
    
    // If dragged email is in selection, drag all selected; otherwise just this one
    let emailsToDrag: Email[];
    if (selectedIds.has(emailId) && selectedIds.size > 0) {
      const ids = Array.from(selectedIds);
      setDraggedEmailIds(ids);
      emailsToDrag = emails.filter(e => selectedIds.has(e.id));
    } else {
      setDraggedEmailIds([emailId]);
      emailsToDrag = [email];
    }
    
    // Store full email objects for filter creation
    setDraggedEmailsState(emailsToDrag);
    
    // Count unread emails being dragged
    const unreadCount = emailsToDrag.filter(e => !e.isRead).length;
    setDraggedUnreadCount(unreadCount);
    
    console.log(`📦 DnD: Started drag from ${sourceInfo.pageType}${sourceInfo.labelId ? ` (label: ${sourceInfo.labelId})` : ''}`);
  }, [emailSourceGetters]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      // Check if over a folder (folders have ids like 'folder-LABELID' or just 'LABELID')
      const overId = over.id as string;
      if (overId.startsWith('folder-')) {
        setOverFolderId(overId.replace('folder-', ''));
      } else if (overId.startsWith('Label_') || ['INBOX', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT'].includes(overId)) {
        setOverFolderId(overId);
      } else {
        setOverFolderId(null);
      }
    } else {
      setOverFolderId(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    
    if (over && draggedEmailIds.length > 0 && onDropOnFolder) {
      const overId = over.id as string;
      let folderId = overId;
      
      // Extract folder ID if prefixed
      if (overId.startsWith('folder-')) {
        folderId = overId.replace('folder-', '');
      }
      
      // Check if dropped on a valid folder
      const isValidFolder = folderId.startsWith('Label_') || 
        ['INBOX', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT'].includes(folderId);
      
      if (isValidFolder) {
        const folderName = over.data?.current?.name || folderId;
        console.log(`📦 DnD: Dropping ${draggedEmailIds.length} emails (${draggedUnreadCount} unread) on folder: ${folderName} (${folderId})`);
        console.log(`📦 DnD: Source - pageType: ${sourcePageType}, labelId: ${sourceLabelId}`);
        
        try {
          await onDropOnFolder(
            draggedEmailIds, 
            folderId, 
            folderName, 
            draggedUnreadCount, 
            draggedEmails,
            { labelId: sourceLabelId, pageType: sourcePageType }
          );
        } catch (error) {
          console.error('📦 DnD: Error dropping on folder:', error);
        }
      }
    }
    
    // Reset state
    setActiveEmail(null);
    setDraggedEmailIds([]);
    setDraggedEmailsState([]);
    setDraggedUnreadCount(0);
    setOverFolderId(null);
    setSourceLabelId(null);
    setSourcePageType(null);
  }, [draggedEmailIds, draggedEmails, draggedUnreadCount, sourceLabelId, sourcePageType, onDropOnFolder]);

  const handleDragCancel = useCallback(() => {
    setActiveEmail(null);
    setDraggedEmailIds([]);
    setDraggedEmailsState([]);
    setDraggedUnreadCount(0);
    setOverFolderId(null);
    setSourceLabelId(null);
    setSourcePageType(null);
  }, []);

  const contextValue = useMemo(() => ({
    activeEmail,
    draggedEmailIds,
    dragCount,
    overFolderId,
    sourceLabelId,
    sourcePageType,
    setDraggedEmails,
    registerEmailSource,
  }), [activeEmail, draggedEmailIds, dragCount, overFolderId, sourceLabelId, sourcePageType, setDraggedEmails, registerEmailSource]);

  return (
    <EmailDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        
        {/* Drag Overlay - Compact conversation count box */}
        {createPortal(
          <DragOverlay
            dropAnimation={null}
            zIndex={99999}
            style={{ width: 'auto', height: 'auto' }}
          >
            {activeEmail ? (
              <div 
                className="pointer-events-none bg-white border border-gray-300 rounded-md shadow-lg flex items-center gap-1.5 whitespace-nowrap"
                style={{ 
                  zIndex: 99999,
                  width: 'fit-content',
                  padding: '6px 10px'
                }}
              >
                <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                  {dragCount} {dragCount === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </EmailDndContext.Provider>
  );
}
