import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Email } from '@/types';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLabel } from '@/contexts/LabelContext';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';
import { createGmailFilter, fetchGmailLabels } from '@/integrations/gapiService';
import { cleanEmailAddress } from '@/utils/emailFormatting';
import { filterAndPrepareLabels } from '../utils/labelFiltering';

interface CreateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  email: Email;
  onLabelCreated?: (labelName: string) => void;
}

export function CreateLabelModal({
  isOpen,
  onClose,
  initialName = '',
  email
}: CreateLabelModalProps) {
  const { labels, addLabel } = useLabel();
  const { currentProfile } = useProfile();
  const [newLabelName, setNewLabelName] = useState(initialName);
  const [nestUnder, setNestUnder] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [autoFilterFuture, setAutoFilterFuture] = useState(false);
  const [skipInbox, setSkipInbox] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // 🔧 SELF-FILTER BUG FIX (Dec 2025): Get current user's email
  const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();
  const senderEmail = cleanEmailAddress(email.from?.email || '').toLowerCase();
  const isSenderSelf = senderEmail === currentUserEmail && currentUserEmail !== '';

  // Update initial name when prop changes
  useEffect(() => {
    if (isOpen) {
      setNewLabelName(initialName);
      setNestUnder(false);
      setParentLabel('');
      setAutoFilterFuture(false);
    }
  }, [isOpen, initialName]);

  // Filter labels for parent selection
  const filteredLabels = filterAndPrepareLabels(labels);

  const handleSubmit = async () => {
    const base = newLabelName.trim();
    if (!base) return;
    
    const fullName = nestUnder && parentLabel ? `${parentLabel}/${base}` : base;
    
    try {
      await addLabel(fullName);
      toast.success(`Folder "${fullName}" created`);

      // Auto-filter feature: create a Gmail filter if checkbox was checked
      if (autoFilterFuture) {
        const sender = cleanEmailAddress(email.from?.email || '');
        if (!sender) {
          toast.error('Cannot create auto-rule: missing sender email');
          onClose();
          return;
        }
        
        // 🔧 SELF-FILTER BUG FIX: Skip filter if sender is self
        if (isSenderSelf) {
          toast.warning('Auto-rule skipped: Cannot create rule for your own email address.');
          onClose();
          return;
        }

        try {
          toast.message('Creating auto-rule...');
          
          const labelsList = await fetchGmailLabels();
          const gmailLabelName = `INBOX/${fullName}`;
          const match = labelsList
            .map(l => ({ id: (l as any).id, name: (l as any).name }))
            .find(l => l.name === gmailLabelName || l.name === fullName);

          if (!match?.id) {
            toast.error('Folder created but auto-rule failed: could not find folder in Gmail');
            onClose();
            return;
          }

          const action: { addLabelIds: string[]; removeLabelIds?: string[] } = { 
            addLabelIds: [match.id]
          };
          if (skipInbox) {
            action.removeLabelIds = ['INBOX'];
          }
          await createGmailFilter({ from: sender }, action);

          toast.success(`Auto-rule created! Future emails from ${sender} will be moved to "${fullName}"`);
        } catch (filterErr) {
          console.error('Failed to create auto-filter:', filterErr);
          toast.error('Folder created, but auto-rule creation failed.');
        }
      }
      
      onClose();
    } catch (err) {
      toast.error('Failed to create folder');
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
            <h2 className="text-lg font-semibold text-gray-900">New folder</h2>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Folder name</label>
              <Input
                placeholder="Enter folder name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="nest-under-create"
                checked={nestUnder}
                onCheckedChange={(checked) => setNestUnder(!!checked)}
              />
              <label htmlFor="nest-under-create" className="text-sm text-gray-600">
                Nest folder under
              </label>
            </div>

            {nestUnder && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Parent folder</label>
                <Select value={parentLabel} onValueChange={setParentLabel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose parent folder..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {filteredLabels.map((label: any) => (
                      <SelectItem key={label.id} value={label.displayName}>
                        {label.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="auto-filter-future"
                checked={autoFilterFuture}
                onCheckedChange={(checked) => setAutoFilterFuture(!!checked)}
              />
              <label htmlFor="auto-filter-future" className="text-sm text-gray-600">
                Also auto-move future emails from {cleanEmailAddress(email.from?.email) || 'this sender'}
              </label>
            </div>

            {autoFilterFuture && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="skip-inbox-create"
                  checked={skipInbox}
                  onCheckedChange={(checked) => setSkipInbox(!!checked)}
                />
                <label htmlFor="skip-inbox-create" className="text-sm text-gray-600">
                  Skip Inbox
                </label>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newLabelName.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
