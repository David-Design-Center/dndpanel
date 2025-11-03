import { memo, useState } from 'react';
import { GmailLabel } from '@/types';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import LabelTreeSelector from './LabelTreeSelector';

interface LabelSelectorProps {
  type: 'add' | 'remove';
  allLabels: Map<string, GmailLabel>;
  availableLabels: GmailLabel[];
  selectedLabelIds: string[];
  onLabelChange: (newLabelIds: string[]) => void;
  disabled?: boolean;
}

const LabelSelector = memo(({
  type,
  allLabels,
  availableLabels,
  selectedLabelIds,
  onLabelChange,
  disabled = false
}: LabelSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (labelId: string) => {
    if (!selectedLabelIds.includes(labelId)) {
      onLabelChange([...selectedLabelIds, labelId]);
    }
    setOpen(false);
  };

  const handleRemove = (labelId: string) => {
    onLabelChange(selectedLabelIds.filter(id => id !== labelId));
  };

  return (
    <div>
      <Label>{type === 'add' ? 'Add Labels' : 'Remove Labels'}</Label>
      
      <div className="relative" style={{ zIndex: 9999 }}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10 bg-white"
              disabled={disabled}
            >
              <span className="text-gray-500 text-sm">
                {`Select label to ${type}`}
              </span>
              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 !bg-white border border-gray-200 shadow-lg !z-[9999] rounded-md"
            align="start"
            sideOffset={4}
            style={{ backgroundColor: 'white', zIndex: 9999 }}
          >
            <LabelTreeSelector
              availableLabels={availableLabels}
              onSelect={handleSelect}
              searchPlaceholder={`Search labels to ${type}...`}
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedLabelIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabelIds.map(labelId => {
            const label = allLabels.get(labelId);
            return (
              <Badge
                key={labelId}
                variant={type === 'add' ? 'secondary' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleRemove(labelId)}
              >
                {label?.name || labelId} ×
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
});

LabelSelector.displayName = 'LabelSelector';
export default LabelSelector;
