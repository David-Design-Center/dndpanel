import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Email } from '@/types';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLabel } from '@/contexts/LabelContext';
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
  const [newLabelName, setNewLabelName] = useState(initialName);
  const [nestUnder, setNestUnder] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [autoFilterFuture, setAutoFilterFuture] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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
      toast.success(`Label "${fullName}" created`);

      // Auto-filter feature: create a Gmail filter if checkbox was checked
      if (autoFilterFuture) {
        const sender = cleanEmailAddress(email.from?.email || '');
        if (!sender) {
          toast.error('Cannot create auto-filter: missing sender email');
          onClose();
          return;
        }

        try {
          toast.message('Creating auto-filter rule...');
          
          const labelsList = await fetchGmailLabels();
          const gmailLabelName = `INBOX/${fullName}`;
          const match = labelsList
            .map(l => ({ id: (l as any).id, name: (l as any).name }))
            .find(l => l.name === gmailLabelName || l.name === fullName);

          if (!match?.id) {
            toast.error('Label created but auto-filter failed: could not find label in Gmail');
            onClose();
            return;
          }

          await createGmailFilter(
            { from: sender },
            { 
              addLabelIds: [match.id],
              removeLabelIds: ['INBOX']
            }
          );

          toast.success(`Auto-filter created! Future emails from ${sender} will be moved to "${fullName}"`);
        } catch (filterErr) {
          console.error('Failed to create auto-filter:', filterErr);
          toast.error('Label created, but auto-filter creation failed.');
        }
      }
      
      onClose();
    } catch (err) {
      toast.error('Failed to create label');
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
            <h2 className="text-lg font-semibold text-gray-900">New label</h2>
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
              <label className="text-sm text-gray-600">Label name</label>
              <Input
                placeholder="Enter label name"
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
                Nest label under
              </label>
            </div>

            {nestUnder && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Parent label</label>
                <Select value={parentLabel} onValueChange={setParentLabel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose parent label..." />
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
                Also auto-label future emails from {cleanEmailAddress(email.from?.email) || 'this sender'}
              </label>
            </div>
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
