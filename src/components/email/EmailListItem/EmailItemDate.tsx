import { ReactNode } from 'react';

interface EmailItemDateProps {
  formattedDate: string;
  showActions?: boolean;
  children?: ReactNode; // Action buttons to show on hover
}

export function EmailItemDate({ formattedDate, children }: EmailItemDateProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums group-hover:hidden">
        {formattedDate}
      </span>
      {children}
    </div>
  );
}
