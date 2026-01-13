import { useState } from 'react';
import { Email } from '@/types';
import { useDraggable } from '@dnd-kit/core';
import { useLayoutState } from '@/contexts/LayoutStateContext';
import { TableRow, TableCell } from '@/components/ui/table';
import { formatEmailDate, calculateContextMenuPosition, getEmailRowClassName } from './utils/emailItemFormatting';
import { useEmailItemActions } from './hooks/useEmailItemActions';
import { EmailItemControls } from './EmailListItem/EmailItemControls';
import { EmailItemContent } from './EmailListItem/EmailItemContent';
import { EmailItemDate } from './EmailListItem/EmailItemDate';
import { EmailItemActions } from './EmailListItem/EmailItemActions';
import { EmailItemContextMenu } from './EmailListItem/EmailItemContextMenu';
import { CreateLabelModal } from './EmailListItem/CreateLabelModal';
import { CreateFilterModal } from './EmailListItem/CreateFilterModal';

interface EmailListItemProps {
  email: Email;
  onClick: (id: string) => void;
  isDraggable?: boolean;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
  isDraft?: boolean;
  currentTab?: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail';
  onCreateFilter?: (email: Email) => void;
  isSelected?: boolean;
  onToggleSelect?: (emailId: string) => void;
  renderAsTableRow?: boolean;
}

function EmailListItem({ 
  email, 
  onClick, 
  isDraggable = true, 
  onEmailUpdate, 
  onEmailDelete, 
  isDraft = false, 
  currentTab,
  onCreateFilter, 
  isSelected = false, 
  onToggleSelect, 
  renderAsTableRow = true 
}: EmailListItemProps) {
  const { selectedEmailId } = useLayoutState();
  
  // Email actions hook
  const {
    handleToggleReadStatus,
    handleToggleImportance,
    handleToggleStar,
    handleDelete,
    handleDeleteEmail,
    handleApplyLabel,
    isToggling,
    isTogglingImportance,
    isTogglingStar
  } = useEmailItemActions({ email, onEmailUpdate, onEmailDelete });
  
  // Context menu and modals state
  const [contextMenuState, setContextMenuState] = useState({ x: 0, y: 0, show: false });
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [createLabelInitialName, setCreateLabelInitialName] = useState('');
  
  // Draggable for drag-to-folder
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: email.id,
    disabled: !isDraggable,
    data: {
      type: 'email',
      email
    }
  });
  
  // When dragging, hide the original element (DragOverlay shows the ghost)
  const style = {
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' as const : 'visible' as const
  };

  // Computed values
  const isActiveEmail = selectedEmailId === email.id;
  const isSentFolder = currentTab === 'sent';
  const formattedDate = formatEmailDate(email.date);
  const rowClassName = getEmailRowClassName(isActiveEmail, isSelected, email.isRead ?? true, isDragging);

  // Handlers
  const handleEmailClick = (e: React.MouseEvent) => {
    // Cmd+click (Mac) or Ctrl+click (Windows) = toggle selection
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      if (onToggleSelect) {
        onToggleSelect(email.id);
      }
      return;
    }
    
    // Normal click = navigate to email
    if (!email.isRead) {
      handleToggleReadStatus();
    }
    onClick(email.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuState(calculateContextMenuPosition(e));
  };

  const handleOpenCreateLabel = (initialName: string) => {
    setCreateLabelInitialName(initialName);
    setShowCreateLabelModal(true);
  };

  const handleApplyLabelFromMenu = async (labelId: string) => {
    await handleApplyLabel(labelId);
    setContextMenuState({ x: 0, y: 0, show: false });
  };

  // Render content
  const renderCellContent = () => (
    <div className="flex items-center px-4 pr-4 overflow-hidden" style={{ height: '32px', lineHeight: '32px' }}>
      <EmailItemControls
        email={email}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onToggleStar={handleToggleStar}
        onToggleImportant={handleToggleImportance}
        isTogglingStar={isTogglingStar}
        isTogglingImportance={isTogglingImportance}
      />
      <EmailItemContent email={email} isSentFolder={isSentFolder} />
    </div>
  );

  const renderDateActions = () => (
    <div className="flex items-center justify-end gap-1 pr-2" style={{ height: '32px' }}>
      <EmailItemDate formattedDate={formattedDate}>
        <EmailItemActions
          email={email}
          isDraft={isDraft}
          onToggleRead={handleToggleReadStatus}
          onDelete={handleDeleteEmail}
          onDeleteDraft={isDraft ? handleDelete : undefined}
          isToggling={isToggling}
        />
      </EmailItemDate>
    </div>
  );

  if (renderAsTableRow) {
    return (
      <>
        <TableRow
          ref={setNodeRef as unknown as React.Ref<HTMLTableRowElement>}
          {...attributes}
          {...listeners}
          onClick={handleEmailClick}
          onContextMenu={handleContextMenu}
          className={rowClassName}
          data-dragging={isDragging}
          data-email-id={email.id}
          style={{ height: '32px', ...style }}
        >
          <TableCell className="p-0">
            {renderCellContent()}
          </TableCell>
          <TableCell className="p-0 w-28 sm:w-32 align-middle">
            {renderDateActions()}
          </TableCell>
        </TableRow>
        
        <EmailItemContextMenu
          position={contextMenuState}
          onClose={() => setContextMenuState({ x: 0, y: 0, show: false })}
          onApplyLabel={handleApplyLabelFromMenu}
          onCreateFilter={() => {
            setContextMenuState({ x: 0, y: 0, show: false });
            setShowCreateFilterModal(true);
          }}
          onOpenCreateLabel={handleOpenCreateLabel}
        />
        
        <CreateLabelModal
          isOpen={showCreateLabelModal}
          onClose={() => setShowCreateLabelModal(false)}
          initialName={createLabelInitialName}
          email={email}
        />
        
        <CreateFilterModal
          isOpen={showCreateFilterModal}
          onClose={() => setShowCreateFilterModal(false)}
          email={email}
          onFilterCreated={() => onCreateFilter?.(email)}
        />
      </>
    );
  }

  // Fallback div structure (for drag overlay)
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, maxHeight: '32px', height: '32px', lineHeight: '32px' }}
      {...attributes}
      {...listeners}
      onClick={handleEmailClick}
      onContextMenu={handleContextMenu}
      className={rowClassName}
      data-dragging={isDragging}
      data-email-id={email.id}
    >
      <div className="flex items-center px-4 pr-4 overflow-hidden border-b border-gray-100">
        <EmailItemControls
          email={email}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          onToggleStar={handleToggleStar}
          onToggleImportant={handleToggleImportance}
          isTogglingStar={isTogglingStar}
          isTogglingImportance={isTogglingImportance}
        />
        <div className="email-row grid grid-cols-[minmax(0,1fr)_9rem] flex-1 min-w-0 items-center gap-3">
          <EmailItemContent email={email} isSentFolder={isSentFolder} hasDraftInThread={(email as any).hasDraftInThread} />
          <div className="w-40 flex items-center justify-end gap-1">
            <EmailItemDate formattedDate={formattedDate}>
              <EmailItemActions
                email={email}
                isDraft={isDraft}
                onToggleRead={handleToggleReadStatus}
                onDelete={handleDeleteEmail}
                onDeleteDraft={isDraft ? handleDelete : undefined}
                isToggling={isToggling}
              />
            </EmailItemDate>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailListItem;
