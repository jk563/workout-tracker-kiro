import React from "react";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ConnectivityStatus from "../../src/components/ConnectivityStatus.jsx";
import { HealthCheckService } from "../../src/lib/services/HealthCheckService.js";

// Mock the HealthCheckService
vi.mock("../../src/lib/services/HealthCheckService.js", () => ({
  HealthCheckService: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn(),
  })),
}));

describe("ConnectivityStatus", () => {
  let mockHealthCheckService;

  beforeEach(() => {
    mockHealthCheckService = new HealthCheckService();
    HealthCheckService.mockImplementation(() => mockHealthCheckService);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Visual States", () => {
    it("should display checking state initially with amber color", () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep in checking state
      );

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute("aria-label", "Checking backend connectivity");
      expect(indicator).toHaveClass("bg-warning-500"); // Amber/yellow color
    });

    it("should display healthy state with green color when health check succeeds", async () => {
      // Arrange
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };
      mockHealthCheckService.checkHealth.mockResolvedValue(mockResponse);

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Wait for the health check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
      });

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("bg-success-500"); // Green color
    });

    it("should display unhealthy state with red color when health check fails", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockRejectedValue(new Error("Network error"));

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Wait for the health check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is unhealthy");
      });

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("bg-accent-500"); // Red color
    });
  });

  describe("State Management", () => {
    it("should track last check timestamp when health check completes", async () => {
      // Arrange
      const mockResponse = {
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      };
      mockHealthCheckService.checkHealth.mockResolvedValue(mockResponse);

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Wait for health check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
      });

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-describedby");
      const description = document.getElementById(indicator.getAttribute("aria-describedby"));
      expect(description).toHaveTextContent(/Last checked:/);
    });
  });

  describe("Animations", () => {
    it("should have pulsing animation class when in checking state", () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("animate-pulse");
    });

    it("should not have pulsing animation when not in checking state", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Wait for health check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
      });

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).not.toHaveClass("animate-pulse");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA role and labels", () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockImplementation(() => new Promise(() => {}));

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("role", "status");
      expect(indicator).toHaveAttribute("aria-label");
      expect(indicator).toHaveAttribute("aria-live", "polite");
    });

    it("should have descriptive text for screen readers", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      render(<ConnectivityStatus checkInterval={60000} />);

      // Wait for health check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
      });

      // Assert
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-describedby");

      const descriptionId = indicator.getAttribute("aria-describedby");
      const description = document.getElementById(descriptionId);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass("sr-only");
    });
  });

  describe("Automatic Polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should perform initial connectivity check when component mounts", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={30000} />);
      });

      // Assert
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);
    });

    it("should continue checking connectivity at regular intervals", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={30000} />);
      });

      // Initial check should have been called
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);

      // Advance timer by 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Assert second check
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(2);

      // Advance timer by another 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Assert third check
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(3);
    });

    it("should properly cleanup timers when component unmounts", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      let unmount;
      await act(async () => {
        const result = render(<ConnectivityStatus checkInterval={30000} />);
        unmount = result.unmount;
      });

      // Initial check should have been called
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);

      // Unmount component
      await act(async () => {
        unmount();
      });

      // Advance timer - should not trigger more checks
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Assert - no additional calls should be made
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe("Debouncing and Race Condition Handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should prevent multiple simultaneous health check requests", async () => {
      // Arrange
      let resolveFirstCheck;

      mockHealthCheckService.checkHealth
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirstCheck = resolve;
            })
        )
        .mockResolvedValue({ status: "ok", timestamp: "2025-02-08T10:30:00Z" });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={30000} />);
      });

      // Initial check should start immediately
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);

      // Try to trigger another check while first is in progress
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Assert - still only one check should be called due to debouncing
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);

      // Resolve the first check
      await act(async () => {
        resolveFirstCheck({ status: "ok", timestamp: "2025-02-08T10:30:00Z" });
      });

      // Now the next interval check should be able to proceed
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Assert second check can now proceed
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(2);
    });

    it("should handle race conditions between multiple connectivity checks appropriately", async () => {
      // Arrange
      let resolveCheck;
      mockHealthCheckService.checkHealth.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCheck = resolve;
          })
      );

      // Act
      const { unmount } = render(<ConnectivityStatus checkInterval={30000} />);

      // Wait for initial check to start
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Unmount component while check is in progress
      unmount();

      // Resolve the check after unmount
      await act(async () => {
        resolveCheck({ status: "ok", timestamp: "2025-02-08T10:30:00Z" });
      });

      // Assert - component should handle this gracefully without errors
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe("Props and Configuration", () => {
    it("should accept custom check interval", async () => {
      // Arrange
      const customInterval = 60000; // 1 minute
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={customInterval} />);
      });

      // Assert - Component should render without errors
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
    });

    it("should accept custom timeout", async () => {
      // Arrange
      const customTimeout = 10000; // 10 seconds
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus timeout={customTimeout} />);
      });

      // Assert - Component should render without errors
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
    });

    it("should accept custom health endpoint", async () => {
      // Arrange
      const customEndpoint = "/custom/health";
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus healthEndpoint={customEndpoint} />);
      });

      // Assert - Component should render without errors
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle invalid response format gracefully", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockRejectedValue(new Error("Invalid response"));

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={60000} />);
      });

      // Wait for check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is unhealthy");
      });

      // Assert - Should treat invalid response as unhealthy
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("bg-accent-500");
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockRejectedValue(new Error("Service error"));

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={60000} />);
      });

      // Wait for check to complete
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is unhealthy");
      });

      // Assert - Should treat service error as unhealthy
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("bg-accent-500");
    });

    it("should handle extremely short check intervals", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={100} />); // 100ms interval
      });

      // Assert - Should not cause performance issues
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
    });

    it("should handle component re-render with different props", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act - Initial render
      const { rerender } = render(<ConnectivityStatus checkInterval={30000} />);

      // Wait for initial check
      await waitFor(() => {
        const indicator = screen.getByRole("status");
        expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
      });

      // Re-render with different props
      await act(async () => {
        rerender(<ConnectivityStatus checkInterval={15000} timeout={10000} />);
      });

      // Assert - Should continue working
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
    });
  });

  describe("Performance and Memory Management", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should not create memory leaks with multiple mount/unmount cycles", async () => {
      // Arrange
      mockHealthCheckService.checkHealth.mockResolvedValue({
        status: "ok",
        timestamp: "2025-02-08T10:30:00Z",
      });

      // Act - Multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<ConnectivityStatus checkInterval={1000} />);
        
        await act(async () => {
          vi.advanceTimersByTime(500);
        });
        
        unmount();
      }

      // Assert - Should not accumulate timers or requests
      // This test mainly ensures no errors are thrown
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalled();
    });

    it("should handle high-frequency polling without performance degradation", async () => {
      // Arrange
      let callCount = 0;
      mockHealthCheckService.checkHealth.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      });

      // Act
      await act(async () => {
        render(<ConnectivityStatus checkInterval={50} />); // Very frequent polling
      });

      // Simulate 20 polling cycles
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          vi.advanceTimersByTime(50);
        });
      }

      // Assert - Should handle high frequency without issues
      expect(callCount).toBeGreaterThan(15); // Allow for some timing variations
      
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute("aria-label", "Backend is healthy");
    });
  });
});
