package main

import (
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/rs/zerolog"
	"lambda-hello-world/handler"
)

func main() {
	// Configure zerolog with appropriate settings
	logger := configureLogger()

	// Log Lambda initialization
	logger.Info().Msg("Initializing Lambda function")

	// Create handler instance
	lambdaHandler := handler.NewLambdaHandler(logger)

	// Wire handler to Lambda runtime and start
	lambda.Start(lambdaHandler.HandleRequest)
}

// configureLogger sets up zerolog with appropriate configuration for Lambda
func configureLogger() zerolog.Logger {
	// Set log level from environment variable, default to INFO
	logLevel := zerolog.InfoLevel
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		if parsedLevel, err := zerolog.ParseLevel(level); err == nil {
			logLevel = parsedLevel
		}
	}

	// Configure zerolog for Lambda environment
	// Use JSON output for structured logging in CloudWatch
	logger := zerolog.New(os.Stdout).
		Level(logLevel).
		With().
		Timestamp().
		Str("service", "lambda-hello-world").
		Logger()

	return logger
}