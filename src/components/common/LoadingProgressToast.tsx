import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import {
  LOADING_PROGRESS_EVENT,
  LoadingProgressEventDetail,
  LoadingProgressSource
} from '@/utils/loadingProgress';
import { toast } from 'sonner';

const ORDER: LoadingProgressSource[] = ['inbox', 'labels', 'counters'];
const TITLES: Record<LoadingProgressSource, string> = {
  inbox: 'Inbox emails (10s)',
  labels: 'Labels (10s)',
  counters: 'Counters (30s)'
};

type StatusState = 'idle' | 'loading' | 'success' | 'error';
const INITIAL_STATUS: Record<LoadingProgressSource, StatusState> = {
  inbox: 'idle',
  labels: 'idle',
  counters: 'idle'
};

const STATUS_SUBTEXT: Record<StatusState, string> = {
  idle: 'Waiting to start',
  loading: 'Loading…',
  success: 'Completed',
  error: 'Failed'
};

const iconForStatus = (status: StatusState) => {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
};

export function LoadingProgressToast() {
  const [statuses, setStatuses] = useState(INITIAL_STATUS);
  const toastIdRef = useRef<string | number | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoadingProgressEventDetail>).detail;
      if (!detail) return;
      setStatuses(prev => {
        const next = { ...prev };
        if (detail.status === 'start') {
          next[detail.source] = 'loading';
        } else if (detail.status === 'success') {
          next[detail.source] = 'success';
        } else if (detail.status === 'error') {
          next[detail.source] = 'error';
        }
        return next;
      });
    };

    window.addEventListener(LOADING_PROGRESS_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(LOADING_PROGRESS_EVENT, handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const hasStarted = ORDER.some(key => statuses[key] !== 'idle');
    if (!hasStarted) return;

    const CustomContent = (
      <div className="relative w-[380px] max-w-[85vw] rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-white">
        {/* Gradient overlay for stronger visibility */}
        <div className="pointer-events-none absolute inset-0 bg-white" />
                <div className="px-4 pt-4 pb-2">
          <p className="text-base font-semibold text-black">Preparing workspace</p>
        </div>
        <div className="relative px-3 pb-3 space-y-3">
          {ORDER.map(key => {
            const status = statuses[key];
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white/70 backdrop-blur-[1px] px-3 py-2 shadow-sm"
              >
                <div>{iconForStatus(status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{TITLES[key]}</p>
                  <p className="text-xs text-slate-500">{STATUS_SUBTEXT[status]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (!toastIdRef.current) {
      toastIdRef.current = toast.custom(() => CustomContent, {
        id: 'loading-progress',
        duration: Infinity,
        // Force Sonner wrapper to be transparent and padding-less
        className: 'p-0 !bg-transparent !shadow-none !border-0',
        style: { padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' },
      });
    } else {
      toast.custom(() => CustomContent, {
        id: 'loading-progress',
        duration: Infinity,
        className: 'p-0 !bg-transparent !shadow-none !border-0',
        style: { padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' },
      });
    }

    const allSuccess = ORDER.every(key => statuses[key] === 'success');
    const anyError = ORDER.some(key => statuses[key] === 'error');

    if ((allSuccess || anyError) && toastIdRef.current !== null) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        if (toastIdRef.current !== null) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
          setStatuses(INITIAL_STATUS);
        }
      }, 5000);
    } else if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [statuses]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return null;
}
