import { create } from 'zustand';

export const useSystemStore = create((set) => ({
  version: '',
  releaseDate: null,
  isLoading: true,
  error: null,
  fetchVersion: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('https://api.github.com/repos/amazingandyyy/ezjp/releases/latest');
      const data = await response.json();
      if (data.tag_name) {
        set({ 
          version: data.tag_name.replace('v', ''),
          releaseDate: new Date(data.published_at),
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching version:', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));