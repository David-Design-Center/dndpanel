import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';

interface DroppableLabelItemProps {
  label: {
    id: string;
    name: string;
    messagesUnread?: number;
  };
}

function DroppableLabelItem({ label }: DroppableLabelItemProps) {
  const location = useLocation();
  
  const { setNodeRef, isOver } = useDroppable({
    id: `label-${label.id}`,
    data: {
      type: 'label',
      labelId: label.id,
      labelName: label.name
    }
  });

  // Check if current URL matches a label filter
  const isLabelActive = (labelId: string) => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('labelId') === labelId;
  };

  // Function to get label icon based on label ID/name
  const getLabelIcon = (label: any) => {
    return '🏷️';
  };

  return (
    <li ref={setNodeRef}>
      <Link
        to={`/inbox?labelId=${label.id}&labelName=${encodeURIComponent(label.name)}`}
        className={`flex items-center px-4 py-2 text-sm transition-colors rounded-md ${
          isLabelActive(label.id)
            ? 'text-primary-600 bg-primary-50'
            : 'text-gray-600 hover:bg-gray-100'
        } ${isOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''}`}
      >
        <span className="mr-3 text-xs">{getLabelIcon(label)}</span>
        <span className="truncate">{label.name}</span>
        {label.messagesUnread && label.messagesUnread > 0 && (
          <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
            {label.messagesUnread}
          </span>
        )}
      </Link>
    </li>
  );
}

export default DroppableLabelItem;