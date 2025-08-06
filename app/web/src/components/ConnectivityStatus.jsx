import React, { useState, useEffect, useRef, useCallback } from "react";
import { HealthCheckService } from "../lib/services/HealthCheckService.js";

/**
 * @typedef {'checking' | 'healthy' | 'unhealthy'} ConnectivityState
 */

/**
 * @typedef {Object} ConnectivityStatusProps
 * @property {number} [checkInterval=30000] - Polling interval in milliseconds
 * @property {number} [timeout=5000] - Request timeout in milliseconds
 * @property {string} [healthEndpoint='/api/health'] - Health check endpoint URL
 */

/**
 * ConnectivityStatus component displays a visual indicator of backend connectivity
 * with three states: checking (amber), healthy (green), unhealthy (red)
 *
 * @param {ConnectivityStatusProps} props - Component props
 * @returns {JSX.Element} The connectivity status indicator
 */
const ConnectivityStatus = ({
  checkInterval = 30000,
  timeout = 5000,
  healthEndpoint = "/api/health",
}) => {
  const [status, setStatus] = useState(/** @type {ConnectivityState} */ ("checking"));
  const [lastChecked, setLastChecked] = useState(/** @type {Date | null} */ (null));

  // Refs for cleanup and race condition handling
  const intervalRef = useRef(/** @type {NodeJS.Timeout | null} */ (null));
  const healthServiceRef = useRef(/** @type {HealthCheckService | null} */ (null));
  const mountedRef = useRef(true);
  const checkInProgressRef = useRef(false);
  const currentRequestRef = useRef(/** @type {AbortController | null} */ (null));

  // Initialize health service
  useEffect(() => {
    healthServiceRef.current = new HealthCheckService({
      timeout,
      endpoint: healthEndpoint,
    });

    return () => {
      mountedRef.current = false;

      // Cancel any in-flight requests
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
        currentRequestRef.current = null;
      }

      // Reset check in progress flag
      checkInProgressRef.current = false;
    };
  }, [timeout, healthEndpoint]);

  /**
   * Performs a single health check and updates component state
   * Includes debouncing to prevent multiple simultaneous requests
   */
  const performHealthCheck = useCallback(async () => {
    if (!healthServiceRef.current || !mountedRef.current) return;

    // Debouncing: prevent multiple simultaneous health checks
    if (checkInProgressRef.current) {
      return;
    }

    // Cancel any existing request to handle race conditions
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    currentRequestRef.current = new AbortController();
    checkInProgressRef.current = true;

    try {
      setStatus("checking");

      // Perform health check with abort signal for race condition handling
      const response = await healthServiceRef.current.checkHealth(currentRequestRef.current.signal);

      // Check if component is still mounted and this is the current request
      if (!mountedRef.current || currentRequestRef.current?.signal.aborted) {
        return;
      }

      if (response.status === "ok") {
        setStatus("healthy");
      } else {
        setStatus("unhealthy");
      }

      setLastChecked(new Date());
    } catch (error) {
      // Check if component is still mounted and this is the current request
      if (!mountedRef.current || currentRequestRef.current?.signal.aborted) {
        return;
      }

      setStatus("unhealthy");
      setLastChecked(new Date());

      // Log error for debugging (in development)
      if (import.meta.env.DEV) {
        console.warn("Health check failed:", error.message);
      }
    } finally {
      // Reset the check in progress flag
      if (mountedRef.current) {
        checkInProgressRef.current = false;
        currentRequestRef.current = null;
      }
    }
  }, []);

  // Initial health check and setup polling
  useEffect(() => {
    // Perform initial check immediately
    performHealthCheck();

    // Set up polling interval
    intervalRef.current = window.setInterval(performHealthCheck, checkInterval);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Cancel any in-flight requests
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
        currentRequestRef.current = null;
      }

      // Reset check in progress flag
      checkInProgressRef.current = false;
    };
  }, [performHealthCheck, checkInterval]);

  // Generate unique ID for accessibility
  const descriptionId = `connectivity-status-description-${React.useId()}`;

  // Get status-specific styling and labels
  const getStatusConfig = () => {
    switch (status) {
      case "checking":
        return {
          bgColor: "bg-warning-500",
          ariaLabel: "Checking backend connectivity",
          description: "Checking connection to backend services...",
          animate: true,
        };
      case "healthy":
        return {
          bgColor: "bg-success-500",
          ariaLabel: "Backend is healthy",
          description: `Backend is healthy. Last checked: ${lastChecked?.toLocaleTimeString() || "Unknown"}`,
          animate: false,
        };
      case "unhealthy":
        return {
          bgColor: "bg-accent-500",
          ariaLabel: "Backend is unhealthy",
          description: `Backend is unhealthy. Last checked: ${lastChecked?.toLocaleTimeString() || "Unknown"}`,
          animate: false,
        };
      default:
        return {
          bgColor: "bg-warning-500",
          ariaLabel: "Checking backend connectivity",
          description: "Checking connection to backend services...",
          animate: true,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6"
      role="complementary"
      aria-label="Backend connectivity status"
    >
      <div
        role="status"
        aria-label={statusConfig.ariaLabel}
        aria-describedby={descriptionId}
        aria-live="polite"
        className={`
          w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-200 ease-in-out
          ${statusConfig.bgColor}
          ${statusConfig.animate ? "animate-pulse" : ""}
        `}
        style={{
          backgroundColor: statusConfig.animate
            ? "var(--warning-500)"
            : status === "healthy"
              ? "var(--success-500)"
              : "var(--accent-500)",
        }}
      />

      {/* Screen reader description */}
      <div id={descriptionId} className="sr-only">
        {statusConfig.description}
      </div>
    </div>
  );
};

export default ConnectivityStatus;
