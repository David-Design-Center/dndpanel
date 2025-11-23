/**
 * Request queue utility to prevent concurrent Gmail API requests
 * and avoid rate limiting issues
 */

interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 5; // More aggressive for speed
  private activeRequests = 0;
  private requestDelay = 50; // Even faster - 50ms delay

  /**
   * Add a request to the queue
   */
  async enqueue<T>(id: string, request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        request,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const queuedRequest = this.queue.shift();
      if (!queuedRequest) continue;

      this.activeRequests++;
      
      this.executeRequest(queuedRequest);
      
      // Add delay between requests to prevent rate limiting
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      }
    }

    this.processing = false;
  }

  /**
   * Execute a single request with error handling and retry logic
   */
  private async executeRequest(queuedRequest: QueuedRequest, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      console.log(`🔄 Executing queued request: ${queuedRequest.id}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
      const result = await queuedRequest.request();
      queuedRequest.resolve(result);
      console.log(`✅ Completed queued request: ${queuedRequest.id}`);
    } catch (error: any) {
      // Check if it's a rate limit error (429) and we haven't exceeded max retries
      if (error?.status === 429 && retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⏳ Rate limit hit for ${queuedRequest.id}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          this.executeRequest(queuedRequest, retryCount + 1);
        }, backoffDelay);
        return; // Don't resolve/reject yet, let the retry handle it
      }
      
      console.error(`❌ Failed queued request: ${queuedRequest.id}`, error);
      queuedRequest.reject(error);
    } finally {
      this.activeRequests--;
      
      // Continue processing if there are more requests
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), this.requestDelay);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.queue.forEach(req => {
      req.reject(new Error('Request cancelled'));
    });
    this.queue = [];
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing
    };
  }
}

// Global request queue instance
export const gmailRequestQueue = new RequestQueue();

export const getGmailQueueStatus = () => gmailRequestQueue.getStatus();

/**
 * Wrapper function to queue Gmail API requests
 */
export async function queueGmailRequest<T>(
  operationName: string, 
  request: () => Promise<T>
): Promise<T> {
  const requestId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return gmailRequestQueue.enqueue(requestId, request);
}
