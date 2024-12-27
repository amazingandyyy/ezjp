import { create } from 'zustand';

const formatReleaseDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  }).format(date);
};

const useSystemStore = create((set) => ({
  version: '',
  releaseDate: null,
  isLoading: true,
  error: null,
  fetchVersion: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Create a promise that resolves after 3 seconds
      const delay = new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch version info
      const fetchPromise = fetch('https://api.github.com/repos/amazingandyyy/ezjp/releases/latest')
        .then(async response => {
          const data = await response.json();
          if (data.tag_name) {
            return {
              version: data.tag_name.replace('v', ''),
              releaseDate: formatReleaseDate(data.published_at)
            };
          }
          throw new Error('No version found');
        });

      // Wait for both the delay and the fetch to complete
      const [result] = await Promise.all([fetchPromise, delay]);
      
      set({ 
        version: result.version,
        releaseDate: result.releaseDate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching version:', error);
      // Still wait for the minimum delay before showing error
      await new Promise(resolve => setTimeout(resolve, 3000));
      set({ error: error.message, isLoading: false });
    }
  }
}));

export default useSystemStore; 