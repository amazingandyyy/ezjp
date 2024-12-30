export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();

    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Calculate remainders
    const remainingHours = Math.abs(diffInHours % 24);
    const remainingMinutes = Math.abs(diffInMinutes % 60);

    if (diffInDays >= 7) {
      return `${Math.floor(diffInDays / 7)}週間前`;
    } else if (diffInDays > 0) {
      return `${diffInDays}日${remainingHours}時間前`;
    } else if (remainingHours > 0) {
      return `${remainingHours}時間${remainingMinutes}分前`;
    } else if (remainingMinutes > 0) {
      return `${remainingMinutes}分前`;
    } else if (diffInSeconds > 0) {
      return '1分前';
    } else {
      return 'たった今';
    }
  } catch (e) {
    console.error('Error formatting relative time:', e, dateStr);
    return '';
  }
};

export const formatJapaneseDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    // Convert to JST (UTC+9)
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original string if invalid date
    
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const jpTime = `${jstDate.getUTCFullYear()}年${jstDate.getUTCMonth() + 1}月${jstDate.getUTCDate()}日 ${String(jstDate.getUTCHours()).padStart(2, '0')}時${String(jstDate.getUTCMinutes()).padStart(2, '0')}分`;
    const relativeTime = formatRelativeTime(dateStr);
    return relativeTime ? `${jpTime}（${relativeTime}）` : jpTime;
  } catch (e) {
    console.error('Error formatting date:', e, dateStr);
    return dateStr;
  }
}; 