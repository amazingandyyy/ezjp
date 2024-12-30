export const getNewsSource = (url) => {
  if (!url) return 'unknown';
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    switch (true) {
      case hostname.includes('nhk.or.jp'):
        return 'nhk';
      case hostname.includes('mainichi.jp'):
        return 'mainichi';
      default:
        return 'unknown';
    }
  } catch (e) {
    return 'unknown';
  }
};

// Backward compatibility functions
export const isNHKUrl = (url) => getNewsSource(url) === 'nhk';
export const isMainichiUrl = (url) => getNewsSource(url) === 'mainichi';

export const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
};

export const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}; 