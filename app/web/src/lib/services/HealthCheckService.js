/**
 * @typedef {Object} HealthCheckResponse
 * @property {'ok' | 'error'} status - The health status
 * @property {string} timestamp - ISO timestamp of the check
 * @property {string} [message] - Optional message
 * @property {string} [version] - Optional version info
 */

/**
 * @typedef {Object} HealthCheckOptions
 * @property {number} [timeout=5000] - Request timeout in milliseconds
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [baseDelay=1000] - Base delay for exponential backoff in milliseconds
 * @property {string} [endpoint='/api/health'] - Health check endpoint URL
 */

/**
 * Health check service for monitoring backend connectivity
 */
export class HealthCheckService {
  /**
   * @param {HealthCheckOptions} options - Configuration options
   */
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.endpoint = options.endpoint || "/api/health";
  }

  /**
   * Performs a health check with retry logic and exponential backoff
   * @param {AbortSignal} [signal] - Optional abort signal for request cancellation
   * @returns {Promise<HealthCheckResponse>}
   * @throws {Error} When all retry attempts fail
   */
  async checkHealth(signal) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Check if request was aborted before attempting
      if (signal?.aborted) {
        throw new Error("Health check was aborted");
      }

      try {
        const response = await this._performHealthCheck(signal);
        return response;
      } catch (error) {
        lastError = error;

        // If request was aborted, don't retry
        if (signal?.aborted || error.message.includes("aborted")) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this._delay(delay, signal);
      }
    }

    // All retries failed, throw the last error
    throw lastError;
  }

  /**
   * Performs a single health check request
   * @private
   * @param {AbortSignal} [signal] - Optional abort signal for request cancellation
   * @returns {Promise<HealthCheckResponse>}
   */
  async _performHealthCheck(signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Combine external signal with timeout signal
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-200 status codes as failures
      if (!response.ok) {
        throw new Error(
          `Health check failed with status ${response.status}: ${response.statusText}`
        );
      }

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
      } catch {
        // If JSON parsing fails, create a basic response
        data = {
          status: "ok",
          timestamp: new Date().toISOString(),
          message: "Health check successful but response was not valid JSON",
        };
      }

      // Validate response structure
      if (!data.status || !data.timestamp) {
        throw new Error("Invalid health check response format");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle different types of errors
      if (error.name === "AbortError") {
        throw new Error(`Health check timed out after ${this.timeout}ms`);
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to reach health check endpoint");
      }

      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Creates a delay for retry backoff
   * @private
   * @param {number} ms - Delay in milliseconds
   * @param {AbortSignal} [signal] - Optional abort signal to cancel delay
   * @returns {Promise<void>}
   */
  _delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("Delay was aborted"));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new Error("Delay was aborted"));
        });
      }
    });
  }
}
