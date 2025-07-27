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
  private maxConcurrent = 2; // Limit concurrent requests to avoid rate limits
  private activeRequests = 0;
  private requestDelay = 250; // Minimum delay between requests in ms

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
   * Execute a single request with error handling
   */
  private async executeRequest(queuedRequest: QueuedRequest) {
    try {
      console.log(`🔄 Executing queued request: ${queuedRequest.id}`);
      const result = await queuedRequest.request();
      queuedRequest.resolve(result);
      console.log(`✅ Completed queued request: ${queuedRequest.id}`);
    } catch (error) {
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
