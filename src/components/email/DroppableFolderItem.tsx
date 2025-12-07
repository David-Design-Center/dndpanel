import { useDroppable } from '@dnd-kit/core';
import { useEmailDnd } from '../../contexts/EmailDndContext';
import { cn } from '@/lib/utils';

interface DroppableFolderItemProps {
  id: string;
  name: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that makes a folder item a drop target for emails.
 * Shows visual feedback when dragging emails over it.
 */
export function DroppableFolderItem({ id, name, children, className }: DroppableFolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${id}`,
    data: {
      type: 'folder',
      id,
      name,
    },
  });
  
  const { activeEmail } = useEmailDnd();
  
  // Show drop feedback when dragging over this folder
  const isDragging = activeEmail !== null;
  const showDropFeedback = isOver && isDragging;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-colors duration-150 w-full',
        // Highlight on drag over - simple background color change
        showDropFeedback && 'bg-gray-200 rounded-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export default DroppableFolderItem;
