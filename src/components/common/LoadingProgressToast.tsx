import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import {
  LOADING_PROGRESS_EVENT,
  LoadingProgressEventDetail,
  LoadingProgressSource
} from '@/utils/loadingProgress';
import { toast as showToast } from '@/components/ui/use-toast';

const ORDER: LoadingProgressSource[] = ['inbox', 'labels', 'counters'];
const TITLES: Record<LoadingProgressSource, string> = {
  inbox: 'Inbox emails',
  labels: 'Labels',
  counters: 'Counters'
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

type ToastController = ReturnType<typeof showToast> | null;

export function LoadingProgressToast() {
  const [statuses, setStatuses] = useState(INITIAL_STATUS);
  const toastControllerRef = useRef<ToastController>(null);
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

    const description = (
      <div className="mt-2 space-y-3">
        {ORDER.map(key => {
          const status = statuses[key];
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 shadow-sm"
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
    );

    const toastPayload = {
      id: 'loading-progress',
      duration: Infinity,
      title: 'Preparing workspace',
      description,
    } as const;

    if (!toastControllerRef.current) {
      toastControllerRef.current = showToast(toastPayload);
    } else {
      toastControllerRef.current.update({
        ...toastPayload,
        id: toastControllerRef.current.id,
      });
    }

    const allSuccess = ORDER.every(key => statuses[key] === 'success');
    const anyError = ORDER.some(key => statuses[key] === 'error');

    if ((allSuccess || anyError) && toastControllerRef.current !== null) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        if (toastControllerRef.current !== null) {
          toastControllerRef.current.dismiss();
          toastControllerRef.current = null;
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
      if (toastControllerRef.current !== null) {
        toastControllerRef.current.dismiss();
      }
    };
  }, []);

  return null;
}
