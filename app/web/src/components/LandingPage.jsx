import React, { useEffect } from "react";

const LandingPage = () => {
  useEffect(() => {
    // Set page title
    document.title = "Workout Tracker";
  }, []);

  return (
    <div className="container-theme">
      <section
        className="flex flex-col items-center justify-center min-h-screen py-8 fade-in-up"
        aria-labelledby="main-heading"
      >
        <div className="text-center max-w-4xl mx-auto space-y-lg-theme">
          {/* Main heading with responsive typography */}
          <h1
            id="main-heading"
            className="text-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight heading-primary"
          >
            Workout Tracker
          </h1>

          {/* Subtitle with proper contrast */}
          <p className="text-body text-base sm:text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl mx-auto text-secondary">
            Welcome to your fitness journey!
          </p>

          {/* Call-to-action section for future enhancement */}
          <div className="space-y-sm-theme">
            <p className="text-caption max-w-lg mx-auto">
              Track your workouts, monitor your progress, and achieve your fitness goals with our
              comprehensive fitness tracking platform.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
