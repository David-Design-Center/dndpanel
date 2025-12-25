import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Email } from '@/types';
import { X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createGmailFilter, fetchGmailLabels } from '@/integrations/gapiService';
import { cleanEmailAddress } from '@/utils/emailFormatting';
import { cleanEncodingIssues } from '@/utils/textEncoding';
import { useLabel } from '@/contexts/LabelContext';
import { useProfile } from '@/contexts/ProfileContext';
import { filterAndPrepareLabels } from '../utils/labelFiltering';

interface CreateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email;
  onFilterCreated?: () => void;
}

export function CreateFilterModal({
  isOpen,
  onClose,
  email,
  onFilterCreated
}: CreateFilterModalProps) {
  const { labels } = useLabel();
  const { currentProfile } = useProfile();
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const filteredFilterLabels = filterAndPrepareLabels(labels, filterLabelQuery);

  // 🔧 SELF-FILTER BUG FIX (Dec 2025): Get current user's email
  const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();

  const handleCreateFilterWithLabel = async () => {
    const sender = cleanEmailAddress(email.from?.email || '');
    if (!sender) {
      toast.error('Missing sender email');
      return;
    }
    
    // 🔧 SELF-FILTER BUG FIX: Prevent creating filter for own email
    if (sender.toLowerCase() === currentUserEmail) {
      toast.error('Cannot create rule for your own email address. This would affect all your sent emails.');
      return;
    }
    if (!selectedFilterLabel) {
      toast.error('Please select a folder');
      return;
    }

    try {
      toast.message('Creating rule…');
      
      const labelsList = await fetchGmailLabels();
      const match = labelsList
        .map(l => ({ id: (l as any).id, name: (l as any).name }))
        .find(l => (l.name?.startsWith('INBOX/') ? l.name.substring(6) : l.name) === selectedFilterLabel);

      if (!match?.id) {
        toast.error('Selected folder not found in Gmail');
        return;
      }

      await createGmailFilter(
        { from: sender },
        { 
          addLabelIds: [match.id],
          removeLabelIds: ['INBOX']
        }
      );

      toast.success('Rule created. Future emails will be moved to folder.');
      onFilterCreated?.();
      onClose();
    } catch (err) {
      console.error('Failed to create Gmail filter:', err);
      toast.error('Could not create rule. Please check Gmail auth and try again.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Create a rule</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              Always move messages from <span className="font-semibold">
                {cleanEncodingIssues(email.from.name) || cleanEmailAddress(email.from.email)}
              </span> to this folder:
            </p>
            
            <div className="border border-gray-200 rounded-lg">
              {/* Search Bar */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a folder"
                    value={filterLabelQuery}
                    onChange={(e) => setFilterLabelQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {filterLabelQuery && (
                    <button
                      onClick={() => setFilterLabelQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                    >
                      <X size={12} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Labels List */}
              <div className="max-h-56 overflow-y-auto">
                {filteredFilterLabels.length > 0 ? (
                  filteredFilterLabels.map((label: any) => (
                    <button
                      key={label.id}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                        selectedFilterLabel === label.displayName ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedFilterLabel(label.displayName);
                        setFilterLabelQuery(label.displayName);
                      }}
                    >
                      <span className="truncate text-gray-800">{label.displayName}</span>
                      {selectedFilterLabel === label.displayName && (
                        <span className="text-xs text-blue-600">Selected</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">No folders found</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateFilterWithLabel}
            disabled={!selectedFilterLabel}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
