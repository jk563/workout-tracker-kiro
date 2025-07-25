<script>
  import "../app.css";
  import { onMount } from "svelte";

  // Handle dark mode preference
  onMount(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("theme")) {
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  });
</script>

<!-- Skip link for accessibility -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<div
  class="min-h-screen transition-colors duration-200"
  style="background-color: var(--background); color: var(--text-primary);"
>
  <main id="main-content">
    <slot />
  </main>
</div>
