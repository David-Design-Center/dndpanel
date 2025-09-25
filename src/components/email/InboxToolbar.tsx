import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

// Types & query builder
export type SystemTab = 'INBOX' | 'SENT' | 'DRAFTS' | 'IMPORTANT' | 'SPAM' | 'TRASH' | 'ALL_INBOX';
export type CategoryTab = null;
export type Filters = { unread?: boolean; starred?: boolean; attachments?: boolean };

// Build the Gmail API query/labelIds for messages.list
export function buildQuery(system: SystemTab, _category: CategoryTab, f: Filters) {
  // System folders via labelIds
  if (system === 'SENT')      return { labelIds: ['SENT'] };
  if (system === 'DRAFTS')    return { labelIds: ['DRAFT'] };
  if (system === 'IMPORTANT') return { labelIds: ['IMPORTANT'] };
  if (system === 'SPAM')      return { labelIds: ['SPAM'] };
  if (system === 'TRASH')     return { labelIds: ['TRASH'] };

  // Inbox views via search query (unified inbox: All Mail except Sent/Trash/Spam)
  let q = '-in:sent -in:trash -in:spam';
  // ALL_INBOX leaves q as 'in:inbox'
  if (f.unread)      q += ' is:unread';
  if (f.attachments) q += ' has:attachment';
  return { q };
}

export type InboxToolbarState = {
  system: SystemTab;
  category: CategoryTab; // kept for compatibility; always null
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
  // Pagination UI additions
  page?: number;               // zero-based page index
  pageSize?: number;           // number of emails per page currently loaded in view (visible subset)
  totalLoaded?: number;        // number of emails loaded so far (for infinite list)
  hasMore?: boolean;           // if more can be loaded from server
  onNextPage?: () => void;     // load / scroll to next batch
  onPrevPage?: () => void;     // jump to previous page boundary (scroll to top of previous chunk)
}

// Utility function for class names
function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// UnderlineTab component - compact design
function UnderlineTab({
  active, onClick, children, badge, disabled, noTruncate,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  noTruncate?: boolean;
}) {
  const isDisabled = disabled || active; // prevent re-click on active tab
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      role="tab"
      aria-selected={!!active}
      aria-disabled={isDisabled || undefined}
      className={cn(
        "relative shrink-0 h-7 px-1.5 text-xs font-medium transition-colors",
        "text-gray-500 hover:text-gray-900",
        active && "text-gray-900",
        isDisabled && "opacity-50 cursor-default"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {typeof badge === 'number' ? (
          <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-50 text-red-700 text-xs px-1 font-medium">
            {noTruncate ? badge : (badge >= 99 ? '99+' : badge)}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute left-0.5 right-0.5 -bottom-1 h-0.5 rounded transition-colors",
          active ? "bg-blue-600" : "bg-transparent"
        )}
      />
    </button>
  );
}

// ToggleChip component for filters - compact design
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
        "shrink-0 h-6 px-2 text-xs font-medium rounded transition-colors",
        active ? "bg-blue-100 text-blue-700 border border-blue-200" : "hover:bg-gray-50 text-gray-500 border border-transparent",
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
    setState({ system: s, category: null });

  return (
    <div className="sticky top-0 z-30 h-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center gap-1 px-2 md:px-4 overflow-x-auto snap-x snap-mandatory" style={{ minWidth: '480px' }}>
        <div className="flex items-center gap-1 min-w-max snap-start">
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
            noTruncate
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
            className="h-6 w-6 grid place-items-center rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RotateCcw className={`h-3 w-3 text-gray-500 hover:text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Row 2 — Context row with underline tabs and toggle filters
function ToolbarRow2({ state, setState, counts, onEmptyTrash, isRefreshing, isEmptyingTrash, page = 0, pageSize = 50, totalLoaded = 0, hasMore, onNextPage, onPrevPage }: InboxToolbarProps) {
  const showCategories = false; // categories removed per client request
  const showTrashActions = state.system === 'TRASH' && (counts?.TRASH || 0) > 0;
  // categories disabled
  const f = state.filters;

  return (
    <div className="sticky top-10 z-20 h-8 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between gap-1 px-2 md:px-4" style={{ minWidth: '480px' }}>
        {/* Left: Categories when in Inbox, or Delete All when in Trash */}
        <div className="flex items-center gap-1 overflow-x-auto snap-x snap-mandatory">
          {showCategories && (
            <div className="flex items-center gap-1 min-w-max snap-start">
              {/* Categories removed */}
            </div>
          )}
          
          {showTrashActions && onEmptyTrash && (
            <button
              onClick={onEmptyTrash}
              disabled={isRefreshing || isEmptyingTrash}
              className="h-6 px-2 rounded border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Empty trash (permanently delete all)"
            >
              <Trash2 size={10} className={isEmptyingTrash ? 'animate-pulse' : ''} />
              <span className="hidden lg:inline">Delete all</span>
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
          {/* Pagination Controls */}
          <div className="hidden sm:flex items-center ml-2 pl-2 border-l border-gray-200 gap-1">
            <span className="text-[11px] text-gray-500 font-medium">
              {totalLoaded > 0 ? `${Math.min(page*pageSize+1, totalLoaded)}-${Math.min((page+1)*pageSize, totalLoaded)} of ${hasMore ? `${totalLoaded}+` : totalLoaded}` : '0'}
            </span>
            <button
              onClick={onPrevPage}
              disabled={isRefreshing || page === 0}
              className="h-6 w-6 grid place-items-center rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-600"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <button
              onClick={onNextPage}
              disabled={isRefreshing || !hasMore}
              className="h-6 w-6 grid place-items-center rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-600"><path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </button>
          </div>
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
