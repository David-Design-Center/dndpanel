import { Email } from '@/types';
import { Star, Flag } from 'lucide-react';

interface EmailItemControlsProps {
  email: Email;
  isSelected: boolean;
  onToggleSelect?: (emailId: string) => void;
  onToggleStar: (e: React.MouseEvent) => void;
  onToggleImportant: (e: React.MouseEvent) => void;
  isTogglingStar: boolean;
  isTogglingImportance: boolean;
}

export function EmailItemControls({
  email,
  isSelected,
  onToggleSelect,
  onToggleStar,
  onToggleImportant,
  isTogglingStar,
  isTogglingImportance
}: EmailItemControlsProps) {
  return (
    <>
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(email.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      )}

      {/* Star */}
      <button
        onClick={onToggleStar}
        disabled={isTogglingStar}
        className={`mr-3 p-1 rounded transition-colors ${
          isTogglingStar ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'
        }`}
        title={email.isStarred ? 'Remove star' : 'Add star'}
      >
        {email.isStarred ? (
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
        ) : (
          <Star size={16} className="text-gray-400 group-hover:text-yellow-400" />
        )}
      </button>

      {/* Important */}
      <button
        onClick={onToggleImportant}
        disabled={isTogglingImportance}
        className={`mr-3 p-1 rounded transition-colors ${
          isTogglingImportance ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'
        }`}
        title={email.isImportant ? 'Mark not important' : 'Mark important'}
      >
        {email.isImportant ? (
          <Flag size={16} className="text-orange-500 fill-orange-500" />
        ) : (
          <Flag size={16} className="text-gray-400 group-hover:text-orange-400" />
        )}
      </button>
    </>
  );
}
