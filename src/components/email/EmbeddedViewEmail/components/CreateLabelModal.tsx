import { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Input } from '../../../ui/input';
import { Checkbox } from '../../../ui/checkbox';
import { Button } from '../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

interface Label {
  id: string;
  name: string;
  displayName: string;
}

interface CreateLabelModalProps {
  isOpen: boolean;
  modalRef: RefObject<HTMLDivElement>;
  senderEmail: string;
  newLabelName: string;
  onLabelNameChange: (name: string) => void;
  nestUnder: boolean;
  onNestUnderChange: (checked: boolean) => void;
  parentLabel: string;
  onParentLabelChange: (label: string) => void;
  autoFilterFuture: boolean;
  onAutoFilterFutureChange: (checked: boolean) => void;
  availableLabels: Label[];
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * Modal for creating a new email folder/label with optional nesting and auto-filter
 */
export function CreateLabelModal({
  isOpen,
  modalRef,
  senderEmail,
  newLabelName,
  onLabelNameChange,
  nestUnder,
  onNestUnderChange,
  parentLabel,
  onParentLabelChange,
  autoFilterFuture,
  onAutoFilterFutureChange,
  availableLabels,
  onClose,
  onSubmit,
}: CreateLabelModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
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

        {/* Modal Body */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Folder name</label>
              <Input
                placeholder="Enter folder name"
                value={newLabelName}
                onChange={(e) => onLabelNameChange(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="nest-under-create"
                checked={nestUnder}
                onCheckedChange={(checked) => onNestUnderChange(!!checked)}
              />
              <label htmlFor="nest-under-create" className="text-sm text-gray-600">
                Nest folder under
              </label>
            </div>

            {nestUnder && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Parent folder</label>
                <Select value={parentLabel} onValueChange={onParentLabelChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose parent folder..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {availableLabels.map((label) => (
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
                onCheckedChange={(checked) => onAutoFilterFutureChange(!!checked)}
              />
              <label htmlFor="auto-filter-future" className="text-sm text-gray-600">
                Also auto-move future emails from {senderEmail || 'this sender'}
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!newLabelName.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
