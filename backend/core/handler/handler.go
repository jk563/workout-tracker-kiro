package handler

import (
	"context"
	"time"

	"github.com/rs/zerolog"
)

// Response represents the Lambda function response structure
type Response struct {
	StatusCode int    `json:"statusCode"`
	Body       string `json:"body"`
}

// Handler interface defines the contract for Lambda request handling
type Handler interface {
	HandleRequest(ctx context.Context, event interface{}) (Response, error)
}

// LambdaHandler implements the Handler interface
type LambdaHandler struct {
	logger zerolog.Logger
}

// NewLambdaHandler creates a new instance of LambdaHandler with configured logger
func NewLambdaHandler(logger zerolog.Logger) *LambdaHandler {
	return &LambdaHandler{
		logger: logger,
	}
}

// HandleRequest processes the Lambda request and returns "Hello World" response
func (h *LambdaHandler) HandleRequest(ctx context.Context, event interface{}) (Response, error) {
	start := time.Now()
	
	// Log function start
	h.logger.Info().
		Str("function", "HandleRequest").
		Time("start_time", start).
		Msg("Lambda function execution started")

	// Create the "Hello World" response
	response := Response{
		StatusCode: 200,
		Body:       "Hello World",
	}

	// Calculate execution duration
	duration := time.Since(start)

	// Log function completion with timing
	h.logger.Info().
		Str("function", "HandleRequest").
		Int("status_code", response.StatusCode).
		Str("response_body", response.Body).
		Dur("execution_duration", duration).
		Time("completion_time", time.Now()).
		Msg("Lambda function execution completed")

	return response, nil
}