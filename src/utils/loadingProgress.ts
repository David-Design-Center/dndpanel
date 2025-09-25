export type LoadingProgressSource = 'inbox' | 'labels' | 'counters';
export type LoadingProgressStatus = 'start' | 'success' | 'error';

export interface LoadingProgressEventDetail {
  source: LoadingProgressSource;
  status: LoadingProgressStatus;
}

export const LOADING_PROGRESS_EVENT = 'loading-progress';

export const emitLoadingProgress = (
  source: LoadingProgressSource,
  status: LoadingProgressStatus
) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<LoadingProgressEventDetail>(LOADING_PROGRESS_EVENT, {
      detail: { source, status }
    })
  );
};
