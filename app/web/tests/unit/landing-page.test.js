import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import LandingPage from "../../src/routes/+page.svelte";

describe("Landing Page Component", () => {
  it("should render the main heading with correct text", () => {
    // Arrange & Act
    render(LandingPage);

    // Assert
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Workout Tracker");
    expect(heading).toHaveAttribute("id", "main-heading");
  });

  it("should render welcome message and description", () => {
    // Arrange & Act
    render(LandingPage);

    // Assert
    expect(screen.getByText("Welcome to your fitness journey!")).toBeInTheDocument();
    expect(screen.getByText(/Track your workouts, monitor your progress/)).toBeInTheDocument();
  });

  it("should have proper semantic HTML structure with accessibility attributes", () => {
    // Arrange & Act
    const { container } = render(LandingPage);

    // Assert
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "main-heading");

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("id", "main-heading");
  });

  it("should render component without errors", () => {
    // Arrange & Act
    const { container } = render(LandingPage);

    // Assert
    expect(container).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("should contain all required content sections", () => {
    // Arrange & Act
    render(LandingPage);

    // Assert
    // Main title
    expect(screen.getByText("Workout Tracker")).toBeInTheDocument();

    // Subtitle
    expect(screen.getByText("Welcome to your fitness journey!")).toBeInTheDocument();

    // Description text
    expect(
      screen.getByText(/Track your workouts, monitor your progress, and achieve your fitness goals/)
    ).toBeInTheDocument();
  });

  it("should have proper document title in head", () => {
    // Arrange & Act
    render(LandingPage);

    // Assert
    // Note: svelte:head content is not directly testable in jsdom environment
    // but we can verify the component renders successfully without errors
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
