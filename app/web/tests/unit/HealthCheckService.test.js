import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthCheckService } from "../../src/lib/services/HealthCheckService.js";

// AbortController is available in Node.js 16+ and modern browsers
// For older environments, we would need a polyfill
const { AbortController } = globalThis;

// Mock fetch globally
global.fetch = vi.fn();

describe("HealthCheckService", () => {
  let service;
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
    service = new HealthCheckService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default options when none provided", () => {
      // Arrange & Act
      const defaultService = new HealthCheckService();

      // Assert
      expect(defaultService.timeout).toBe(5000);
      expect(defaultService.maxRetries).toBe(3);
      expect(defaultService.baseDelay).toBe(1000);
      expect(defaultService.endpoint).toBe("/api/health");
    });

    it("should use custom options when provided", () => {
      // Arrange
      const options = {
        timeout: 10000,
        maxRetries: 5,
        baseDelay: 2000,
        endpoint: "/custom/health",
      };

      // Act
      const customService = new HealthCheckService(options);

      // Assert
      expect(customService.timeout).toBe(10000);
      expect(customService.maxRetries).toBe(5);
      expect(customService.baseDelay).toBe(2000);
      expect(customService.endpoint).toBe("/custom/health");
    });
  });

  describe("checkHealth", () => {
    it("should return successful health check response", async () => {
      // Arrange
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
        version: "1.0.0",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith("/api/health", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: expect.any(AbortSignal),
      });
    });

    it("should handle non-200 HTTP status codes as failures", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Health check failed with status 503: Service Unavailable"),
        advancePromise,
      ]);
    });

    it("should handle JSON parsing errors gracefully", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(result.message).toContain("response was not valid JSON");
    });

    it("should validate response structure", async () => {
      // Arrange
      const invalidResponse = { invalid: "response" };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidResponse),
      });

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Invalid health check response format"),
        advancePromise,
      ]);
    });

    it("should handle network errors", async () => {
      // Arrange
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Network error: Unable to reach health check endpoint"),
        advancePromise,
      ]);
    });

    it("should handle request timeout", async () => {
      // Arrange
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Health check timed out after 5000ms"),
        advancePromise,
      ]);
    });

    it("should retry failed requests with exponential backoff", async () => {
      // Arrange
      const networkError = new TypeError("Failed to fetch");
      const successResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(successResponse),
        });

      // Act
      const promise = service.checkHealth();

      // Fast-forward through the delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay

      const result = await promise;

      // Assert
      expect(result).toEqual(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should throw error after all retries are exhausted", async () => {
      // Arrange
      const networkError = new TypeError("Failed to fetch");

      // All calls fail (initial + 3 retries = 4 total)
      mockFetch.mockRejectedValue(networkError);

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Network error: Unable to reach health check endpoint"),
        advancePromise,
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it("should not retry on successful response", async () => {
      // Arrange
      const successResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(successResponse),
      });

      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result).toEqual(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should use custom endpoint when configured", async () => {
      // Arrange
      const customService = new HealthCheckService({ endpoint: "/custom/health" });
      const successResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(successResponse),
      });

      // Act
      await customService.checkHealth();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith("/custom/health", expect.any(Object));
    });

    it("should respect custom timeout setting", async () => {
      // Arrange
      const customService = new HealthCheckService({ timeout: 2000 });
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      const promise = customService.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Health check timed out after 2000ms"),
        advancePromise,
      ]);
    });

    it("should respect custom retry configuration", async () => {
      // Arrange
      const customService = new HealthCheckService({
        maxRetries: 1,
        baseDelay: 500,
      });
      const networkError = new TypeError("Failed to fetch");

      mockFetch.mockRejectedValue(networkError);

      // Act & Assert
      const promise = customService.checkHealth();

      // Fast-forward through single retry delay
      const advancePromise = vi.advanceTimersByTimeAsync(500);

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Network error: Unable to reach health check endpoint"),
        advancePromise,
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("abort signal support", () => {
    it("should handle abort signal during health check", async () => {
      // Arrange
      const controller = new AbortController();
      controller.abort(); // Pre-abort the signal

      // Act & Assert
      await expect(service.checkHealth(controller.signal)).rejects.toThrow(
        "Health check was aborted"
      );
    });

    it("should not retry when request is aborted", async () => {
      // Arrange
      const controller = new AbortController();
      controller.abort(); // Pre-abort the signal

      // Act & Assert
      await expect(service.checkHealth(controller.signal)).rejects.toThrow(
        "Health check was aborted"
      );

      // Should not make any fetch calls when pre-aborted
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle abort signal during retry delay", async () => {
      // Arrange
      const controller = new AbortController();
      const networkError = new TypeError("Failed to fetch");

      mockFetch.mockRejectedValue(networkError);

      // Act
      const promise = service.checkHealth(controller.signal);

      // Coordinate timer advancement with promise resolution
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(500); // Wait for first attempt to fail
        controller.abort(); // Abort during retry delay
        await vi.advanceTimersByTimeAsync(1000); // Advance past the retry delay
      })();

      // Wait for both operations to complete
      await Promise.all([expect(promise).rejects.toThrow("Delay was aborted"), advancePromise]);

      // Should only make the initial call, not retry after abort
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should pass abort signal to fetch request", async () => {
      // Arrange
      const controller = new AbortController();
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      await service.checkHealth(controller.signal);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith("/api/health", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed JSON responses", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      });

      // Act
      const result = await service.checkHealth();

      // Assert - Should return fallback response
      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(result.message).toContain("response was not valid JSON");
    });

    it("should handle empty response body", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Invalid health check response format"),
        advancePromise,
      ]);
    });

    it("should handle response with missing timestamp", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }), // Missing timestamp
      });

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Invalid health check response format"),
        advancePromise,
      ]);
    });

    it("should handle response with missing status", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ timestamp: "2025-02-08T10:30:00Z" }), // Missing status
      });

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Invalid health check response format"),
        advancePromise,
      ]);
    });

    it("should handle extremely large response payloads", async () => {
      // Arrange
      const largeResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
        data: "x".repeat(10000), // Large payload
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeResponse),
      });

      // Act
      const result = await service.checkHealth();

      // Assert - Should handle large responses
      expect(result).toEqual(largeResponse);
    });

    it("should handle concurrent health check requests", async () => {
      // Arrange
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act - Make multiple concurrent requests
      const promises = [
        service.checkHealth(),
        service.checkHealth(),
        service.checkHealth(),
      ];

      const results = await Promise.all(promises);

      // Assert - All should succeed
      results.forEach(result => {
        expect(result).toEqual(mockResponse);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle DNS resolution failures", async () => {
      // Arrange
      const dnsError = new TypeError("getaddrinfo ENOTFOUND");
      mockFetch.mockRejectedValue(dnsError);

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("getaddrinfo ENOTFOUND"),
        advancePromise,
      ]);
    });

    it("should handle CORS errors", async () => {
      // Arrange
      const corsError = new TypeError("Failed to fetch");
      corsError.message = "Failed to fetch"; // CORS errors often have this generic message
      mockFetch.mockRejectedValue(corsError);

      // Act & Assert
      const promise = service.checkHealth();

      // Fast-forward through all retry delays
      const advancePromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      })();

      // Wait for both the service promise and timer advancement
      await Promise.all([
        expect(promise).rejects.toThrow("Network error: Unable to reach health check endpoint"),
        advancePromise,
      ]);
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle rapid successive calls efficiently", async () => {
      // Arrange
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = performance.now();

      // Act - Make 10 rapid successive calls
      const promises = Array.from({ length: 10 }, () => service.checkHealth());
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert - Should complete efficiently
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual(mockResponse);
      });

      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000);
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it("should maintain consistent behavior under load", async () => {
      // Arrange
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: "ok",
            timestamp: new Date().toISOString(),
            callNumber: callCount,
          }),
        });
      });

      // Act - Make many concurrent requests
      const promises = Array.from({ length: 50 }, () => service.checkHealth());
      const results = await Promise.all(promises);

      // Assert - All should succeed with unique responses
      expect(results).toHaveLength(50);
      results.forEach((result, index) => {
        expect(result.status).toBe("ok");
        expect(result.timestamp).toBeDefined();
        expect(result.callNumber).toBeGreaterThan(0);
      });

      expect(mockFetch).toHaveBeenCalledTimes(50);
    });
  });
});
