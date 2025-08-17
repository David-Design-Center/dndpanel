import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

// Types & query builder
export type SystemTab = 'INBOX' | 'SENT' | 'DRAFTS' | 'IMPORTANT' | 'SPAM' | 'TRASH' | 'ALL_INBOX';
export type CategoryTab = 'PRIMARY' | 'UPDATES' | 'PROMOTIONS' | null;
export type Filters = { unread?: boolean; starred?: boolean; attachments?: boolean };

// Build the Gmail API query/labelIds for messages.list
export function buildQuery(system: SystemTab, category: CategoryTab, f: Filters) {
  // System folders via labelIds
  if (system === 'SENT')      return { labelIds: ['SENT'] };
  if (system === 'DRAFTS')    return { labelIds: ['DRAFT'] };
  if (system === 'IMPORTANT') return { labelIds: ['IMPORTANT'] };
  if (system === 'SPAM')      return { labelIds: ['SPAM'] };
  if (system === 'TRASH')     return { labelIds: ['TRASH'] };

  // Inbox views via search query
  let q = 'in:inbox';
  if (system === 'INBOX' && category === 'PRIMARY')    q += ' category:primary';
  if (system === 'INBOX' && category === 'UPDATES')    q += ' category:updates';
  if (system === 'INBOX' && category === 'PROMOTIONS') q += ' category:promotions';
  // ALL_INBOX leaves q as 'in:inbox'
  if (f.unread)      q += ' is:unread';
  if (f.starred)     q += ' is:starred';
  if (f.attachments) q += ' has:attachment';
  return { q };
}

export type InboxToolbarState = {
  system: SystemTab;
  category: CategoryTab;
  filters: Filters;
}

export type InboxToolbarProps = {
  state: InboxToolbarState;
  setState: (s: Partial<InboxToolbarState>) => void;
  counts?: Partial<Record<SystemTab, number>> & Partial<Record<'PRIMARY' | 'UPDATES' | 'PROMOTIONS', number>>;
  onQueryChange: (q: { q?: string; labelIds?: string[] }) => void;
  onRefresh?: () => void;
  onEmptyTrash?: () => void;
  isRefreshing?: boolean;
  isEmptyingTrash?: boolean;
}

// Utility function for class names
function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// UnderlineTab component
function UnderlineTab({
  active, onClick, children, badge, disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="tab"
      aria-selected={!!active}
      className={cn(
        "relative shrink-0 h-8 px-2 text-sm font-medium transition-colors",
        "text-gray-500 hover:text-gray-900",
        active && "text-gray-900",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {badge ? (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-50 text-red-700 text-xs px-1 font-medium">
            {badge >= 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      {/* underline */}
      <span
        className={cn(
          "pointer-events-none absolute left-1 right-1 -bottom-2 h-0.5 rounded transition-colors",
          active ? "bg-blue-600" : "bg-transparent"
        )}
      />
    </button>
  );
}

// ToggleChip component for filters
function ToggleChip({
  active, onClick, children, disabled,
}: { 
  active?: boolean; 
  onClick?: () => void; 
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 h-8 px-3 text-sm rounded-md transition-colors",
        active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-600",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

// Row 1 — System folders with underline tabs
function ToolbarRow1({ state, setState, counts, onRefresh, isRefreshing }: Omit<InboxToolbarProps, 'onEmptyTrash' | 'isEmptyingTrash'>) {
  const sys = state.system;
  const setSys = (s: SystemTab) =>
    setState({ system: s, category: s === 'INBOX' ? (state.category ?? 'PRIMARY') : null });

  return (
    <div className="sticky top-0 z-30 h-12 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center gap-3 px-4 md:px-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory">
        <div className="flex items-center gap-3 min-w-max snap-start">
          <UnderlineTab 
            active={sys==='INBOX'} 
            onClick={()=>setSys('INBOX')} 
            disabled={isRefreshing}
          >
            Inbox
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='SENT'} 
            onClick={()=>setSys('SENT')} 
            disabled={isRefreshing}
          >
            Sent
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='DRAFTS'} 
            onClick={()=>setSys('DRAFTS')} 
            disabled={isRefreshing}
            badge={counts?.DRAFTS}
          >
            Drafts
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='IMPORTANT'} 
            onClick={()=>setSys('IMPORTANT')} 
            disabled={isRefreshing}
          >
            Important
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='SPAM'} 
            onClick={()=>setSys('SPAM')} 
            disabled={isRefreshing}
          >
            Spam
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='TRASH'} 
            onClick={()=>setSys('TRASH')} 
            disabled={isRefreshing}
            badge={counts?.TRASH}
          >
            Trash
          </UnderlineTab>
          <UnderlineTab 
            active={sys==='ALL_INBOX'} 
            onClick={()=>setSys('ALL_INBOX')} 
            disabled={isRefreshing}
          >
            All
          </UnderlineTab>
        </div>
        
        <div className="ml-auto shrink-0">
          <button
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RotateCcw className={`h-4 w-4 text-gray-500 hover:text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Row 2 — Context row with underline tabs and toggle filters
function ToolbarRow2({ state, setState, counts, onEmptyTrash, isRefreshing, isEmptyingTrash }: InboxToolbarProps) {
  const showCategories = state.system === 'INBOX';
  const showTrashActions = state.system === 'TRASH' && (counts?.TRASH || 0) > 0;
  const c = state.category ?? 'PRIMARY';
  const f = state.filters;

  return (
    <div className="sticky top-12 z-20 h-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 md:px-5">
        {/* Left: Categories when in Inbox, or Delete All when in Trash */}
        <div className="flex items-center gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory">
          {showCategories && (
            <div className="flex items-center gap-3 min-w-max snap-start">
              <UnderlineTab 
                active={c==='PRIMARY'} 
                onClick={()=>setState({ category:'PRIMARY' })}
              >
                Primary
              </UnderlineTab>
              <UnderlineTab 
                active={c==='UPDATES'} 
                onClick={()=>setState({ category:'UPDATES' })}
              >
                Updates
              </UnderlineTab>
              <UnderlineTab 
                active={c==='PROMOTIONS'} 
                onClick={()=>setState({ category:'PROMOTIONS' })}
              >
                Promotions
              </UnderlineTab>
            </div>
          )}
          
          {showTrashActions && onEmptyTrash && (
            <button
              onClick={onEmptyTrash}
              disabled={isRefreshing || isEmptyingTrash}
              className="h-8 px-3 mt-1 rounded-md border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Empty trash (permanently delete all)"
            >
              <Trash2 size={14} className={isEmptyingTrash ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">Delete all</span>
            </button>
          )}
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible">
          <ToggleChip 
            active={!!f.unread} 
            onClick={()=>setState({ filters:{ ...f, unread: !f.unread } })}
          >
            Unread
          </ToggleChip>
          <ToggleChip 
            active={!!f.starred} 
            onClick={()=>setState({ filters:{ ...f, starred: !f.starred } })}
          >
            Starred
          </ToggleChip>
          <ToggleChip 
            active={!!f.attachments} 
            onClick={()=>setState({ filters:{ ...f, attachments: !f.attachments } })}
          >
            Attachments
          </ToggleChip>
        </div>
      </div>
    </div>
  );
}

// Main InboxToolbar component
export function InboxToolbar(props: InboxToolbarProps) {
  return (
    <>
      <ToolbarRow1 
        state={props.state}
        setState={props.setState}
        counts={props.counts}
        onRefresh={props.onRefresh}
        isRefreshing={props.isRefreshing}
        onQueryChange={props.onQueryChange}
      />
      <ToolbarRow2 {...props} />
    </>
  );
}

export default InboxToolbar;
