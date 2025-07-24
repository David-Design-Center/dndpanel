import { memo, useState, useMemo } from 'react';
import { GmailLabel } from '../types';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Search, X, ChevronsUpDown } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  // Filter labels based on search input
  const filteredLabels = useMemo(() => {
    if (!search.trim()) return availableLabels;
    return availableLabels.filter(label => 
      label.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableLabels, search]);

  const handleSelect = (labelId: string) => {
    if (!selectedLabelIds.includes(labelId)) {
      onLabelChange([...selectedLabelIds, labelId]);
    }
    setSearch('');
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
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 !bg-white border border-gray-200 shadow-lg !z-[9999] rounded-md"
            align="start"
            sideOffset={4}
            style={{ backgroundColor: 'white', zIndex: 9999 }}
          >
            <div className="p-2 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search labels..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  autoFocus
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-gray-100"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto bg-white border-t border-gray-100">
              {filteredLabels.length > 0 ? (
                <div className="p-1">
                  {filteredLabels.map(label => (
                    <Button
                      key={label.id}
                      variant="ghost"
                      className="w-full justify-start h-8 px-2 text-sm hover:bg-gray-100 text-gray-900"
                      onClick={() => handleSelect(label.id)}
                    >
                      {label.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500 bg-white">
                  {search ? `No labels found for "${search}"` : 'No labels available'}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-1 mt-2 min-h-[20px]">
        {selectedLabelIds.map(labelId => {
          const label = allLabels.get(labelId);
          return (
            <Badge
              key={labelId}
              variant={type === 'add' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleRemove(labelId)}
            >
              {label?.name || labelId} ×
            </Badge>
          );
        })}
      </div>
    </div>
  );
});

LabelSelector.displayName = 'LabelSelector';
export default LabelSelector;
