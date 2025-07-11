import { ReactNode } from 'react';

interface KanbanColumnProps {
  title: string;
  count: number;
  children: ReactNode;
  headerClassName?: string;
  className?: string;
}

function KanbanColumn({ title, count, children, className = '' }: KanbanColumnProps) {
  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="bg-white p-3 rounded-t-lg border border-gray-200 shadow-sm">
        <h3 className="font-medium text-gray-800 flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm bg-gray-100 rounded-full px-2 py-1">{count}</span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 rounded-b-lg border-x border-b border-gray-200">
        <div className="space-y-3 min-h-[100px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default KanbanColumn;