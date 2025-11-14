import { useState } from 'react';
import { Email } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useInboxLayout } from '@/contexts/InboxLayoutContext';
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
  onCreateFilter, 
  isSelected = false, 
  onToggleSelect, 
  renderAsTableRow = true 
}: EmailListItemProps) {
  const { selectedEmailId } = useInboxLayout();
  
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
  
  // Sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: email.id,
    disabled: !isDraggable
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // Computed values
  const isActiveEmail = selectedEmailId === email.id;
  const isSentEmail = email.labelIds?.includes('SENT') ?? false;
  const formattedDate = formatEmailDate(email.date);
  const rowClassName = getEmailRowClassName(isActiveEmail, isSelected, email.isRead ?? true, isDragging);

  // Handlers
  const handleEmailClick = () => {
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
      <EmailItemContent email={email} isSentEmail={isSentEmail} />
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
          <EmailItemContent email={email} isSentEmail={isSentEmail} />
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
