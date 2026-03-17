export const keyframes = {
  fromLeftToRight: {
    from: {
      left: '0%',
      transform: 'translateX(0%)',
    },
    to: {
      left: '100%',
      transform: 'translateX(-100%)',
    },
  },
  skeletonShimmer: {
    from: {
      transform: 'translateX(-100%)',
    },
    to: {
      transform: 'translateX(100%)',
    },
  },
  sethFadeInUp: {
    from: {
      opacity: 0,
      transform: 'translateY(12px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  sethSlideDown: {
    from: {
      opacity: 0,
      transform: 'translateY(-12px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  sethFlashGreen: {
    from: {
      backgroundColor: 'rgba(0, 255, 148, 0.08)',
    },
    to: {
      backgroundColor: 'transparent',
    },
  },
  sethBadgePulse: {
    '0%': {
      opacity: 1,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.75,
      transform: 'scale(0.92)',
    },
    '100%': {
      opacity: 1,
      transform: 'scale(1)',
    },
  },
};
