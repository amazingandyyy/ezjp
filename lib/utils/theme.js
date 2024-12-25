// Get system theme preference
export const getSystemTheme = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// Get current theme based on preference
export const getCurrentTheme = (preference) => {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
};