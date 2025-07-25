export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
    // Add CSS optimization for production builds
    ...(process.env.NODE_ENV === "production" && {
      cssnano: {
        preset: [
          "default",
          {
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: true,
            minifySelectors: true,
            minifyParams: true,
            minifyFontValues: true,
            colormin: true,
            calc: true,
            convertValues: true,
            reduceIdents: false, // Keep for CSS custom properties
            mergeRules: true,
            mergeLonghand: true,
            discardDuplicates: true,
            discardEmpty: true,
            discardUnused: false, // Let Tailwind handle unused CSS
            // Additional optimizations
            normalizeUrl: true,
            normalizeString: true,
            normalizeRepeatStyle: true,
            normalizePositions: true,
            normalizeTimingFunctions: true,
            reduceTransforms: true,
            svgo: {
              plugins: [
                {
                  name: "preset-default",
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  },
};
