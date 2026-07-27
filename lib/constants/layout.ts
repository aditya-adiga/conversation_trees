// Opacity values for visual hierarchy based on distance from the current node
export const OPACITY = {
  PARENT: 0.6,
  DEFAULT_CARD: 0.7,
  SIBLING: {
    NEAR: 0.7, // distance === 1
    MEDIUM: 0.45, // distance === 2
    FAR: 0.25, // distance >= 3
  },
  CHILD: {
    MIN: 0.3,
    MAX: 0.85,
    SPREAD: 0.55, // range from MAX to MIN
  },
} as const;
