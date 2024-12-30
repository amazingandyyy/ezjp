import { REPEAT_MODES } from '../page';
import { FaHeart } from 'react-icons/fa';
import { useState } from 'react';

// Add LoadingIndicator component before NewsReaderContent
const LoadingIndicator = ({ loading, theme }) => {
  if (!loading) return null;
  
  const spinnerColors = {
    dark: 'border-gray-300 border-r-transparent',
    light: 'border-gray-400 border-r-transparent'
  };

  const textColors = {
    dark: 'text-gray-500',
    light: 'text-gray-500'
  };
  
  return (
    <div className="inline-flex items-center gap-2 ml-2">
      <div className="w-4 h-4 relative">
        <div className={`absolute inset-0 rounded-full border-2 animate-spin ${spinnerColors[theme]}`}></div>
      </div>
      <span className={`text-xs ${textColors[theme]}`}>Updating preference...</span>
    </div>
  );
};

// Add RubyText component
const RubyText = ({ part, preferenceState = { show_furigana: true } }) => {
  if (!part || part.type !== 'ruby' || !part.kanji || !part.reading) {
    return null;
  }
  return (
    <ruby className="group">
      {part.kanji}
      <rt className={`${preferenceState.show_furigana ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {part.reading}
      </rt>
    </ruby>
  );
};

// Add this function near other utility functions
  const renderTitle = (title, preferenceState) => {
    if (!Array.isArray(title)) return null;
    return title.map((part, index) => {
      if (part.type === 'ruby') {
        return <RubyText key={index} part={part} preferenceState={preferenceState} />;
      } else if (part.type === 'text') {
        return <span key={index}>{part.content}</span>;
      }
      return null;
    });
  };

// Add helper function to process content
const processContent = (content) => {
  if (!Array.isArray(content)) return [];
  return content.map((part, index) => {
    if (part?.type === 'ruby') {
      return {
        type: 'ruby',
        kanji: part.kanji,
        reading: part.reading
      };
    } else if (part?.type === 'text') {
      return {
        type: 'text',
        content: part.content
      };
    }
    return null;
  }).filter(Boolean);
};

// Update RepeatIcon component
const RepeatIcon = ({ className, mode, theme }) => {
  const isActive = mode !== REPEAT_MODES.NONE;
  
  return (
    <div className="relative">
      <svg 
        role="img" 
        viewBox="-1 -1 18 18" 
        className={className}
        stroke={isActive ? "rgb(168 85 247)" : "currentColor"}
        fill={isActive ? "rgb(168 85 247)" : "currentColor"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.1"
      >
        <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path>
      </svg>
      {isActive && (
        <>
          {mode === REPEAT_MODES.ONE && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className={`bg-purple-500 rounded w-3 h-2 flex items-center justify-center ring-[0.3px] ${theme === 'dark' ? 'ring-gray-700' : 'ring-white'}`}>
                <span className="text-[6px] font-bold text-white leading-none tracking-tighter">1</span>
              </div>
            </div>
          )}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500"></div>
        </>
      )}
    </div>
  );
};

// Add SavedNewsList component before NewsReaderContent
const SavedNewsList = ({ news, theme, sourceUrl, onNewsClick, finishedUrls }) => {
  const parseTitle = (title) => {
    try {
      // If title is a string that looks like JSON, parse it
      if (typeof title === 'string' && (title.startsWith('[') || title.startsWith('{'))) {
        title = JSON.parse(title);
      }
      
      if (Array.isArray(title)) {
        return title.map(part => {
          if (part.type === 'ruby') {
            return part.kanji;
          } else if (part.type === 'text') {
            return part.content;
          }
          return '';
        }).join('');
      }
      return title;
    } catch (e) {
      console.error('Error parsing title:', e);
      return title || '';
    }
  };

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <FaHeart className={`w-6 h-6 mb-2 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
          No saved articles yet
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {news.map((article, index) => (
        <button
          key={index}
          onClick={() => onNewsClick(article.url)}
          className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex gap-4 group relative
            ${
              theme === "dark"
                ? article.url === sourceUrl
                  ? "bg-gray-800/90 ring-1 ring-gray-700"
                  : "hover:bg-gray-800/70 hover:ring-1 hover:ring-gray-700"
                : article.url === sourceUrl
                ? "bg-gray-100/90 ring-1 ring-gray-200"
                : "hover:bg-gray-50/90 hover:ring-1 hover:ring-gray-200"
            }`}
        >
          <div className="flex-shrink-0 relative">
            {article.image || article.article?.images?.[0] ? (
              <div className="w-20 h-20 relative rounded-lg overflow-hidden ring-1 ring-black/5">
                <img
                  src={article.image || article.article?.images?.[0]}
                  alt=""
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.target.parentElement.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              } ring-1 ring-black/5`}>
                <svg className={`w-6 h-6 ${
                  theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
              </div>
            )}
            <div className="absolute -top-1.5 -right-1.5 flex gap-1">
              <div className="bg-red-500 rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-[rgb(19,31,36)]">
                <FaHeart className="w-2.5 h-2.5 text-white" />
              </div>
              {finishedUrls.has(article.url) && (
                <div className="bg-green-500 rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-[rgb(19,31,36)]">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <h3 className={`font-medium mb-1 line-clamp-2 ${
              theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}>
              {parseTitle(article.article?.title)}
            </h3>
            <p className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
              {new Date(article.created_at).toLocaleDateString()}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

// Add after the LoadingIndicator component
const MotivationalMessage = ({ show, theme }) => {
  const messages = [
    // Achievement messages
    { ja: '🎉 よくできました！', en: 'Well done!' },
    { ja: '⭐️ 素晴らしい！', en: 'Excellent!' },
    { ja: '💪 頑張りましたね！', en: 'Great effort!' },
    { ja: '🌟 継続は力なり', en: 'Consistency is power' },
    { ja: '🚀 一歩一歩前進', en: 'Step by step' },
    { ja: '🌱 日々の努力が実を結ぶ', en: 'Daily efforts bear fruit' },
    // Encouraging messages
    { ja: '✨ すごい進歩です！', en: 'Amazing progress!' },
    { ja: '🎯 目標達成！', en: 'Goal achieved!' },
    { ja: '🌈 その調子！', en: "That's the spirit!" },
    { ja: '💫 輝かしい成果！', en: 'Brilliant result!' },
    // Learning journey messages
    { ja: '📚 知識は力なり', en: 'Knowledge is power' },
    { ja: '🎓 学びは冒険だ', en: 'Learning is an adventure' },
    { ja: '🌅 新しい朝が来た', en: 'A new dawn awaits' },
    { ja: '🔥 情熱を持ち続けて', en: 'Keep the passion alive' },
    // Milestone messages
    { ja: '🏆 また一つ達成！', en: 'Another milestone reached!' },
    { ja: '⚡️ 止まらない成長', en: 'Unstoppable growth' },
    { ja: '🎨 上手くなってきた', en: "You're getting better!" },
    { ja: '🌊 波に乗ってる！', en: "You're on a roll!" },
    // Wisdom messages
    { ja: '🍀 努力は裏切らない', en: 'Hard work pays off' },
    { ja: '🌸 千里の道も一歩から', en: 'Every journey begins with a step' },
    { ja: '🎋 夢は叶うもの', en: 'Dreams do come true' },
    { ja: '🎭 日本語の世界へようこそ', en: 'Welcome to the world of Japanese' },
    // Fun messages
    { ja: '🌈 やったね！', en: 'You did it!' },
    { ja: '🎪 素晴らしいショー！', en: 'What a performance!' },
    { ja: '🎮 レベルアップ！', en: 'Level up!' },
    { ja: '🎵 リズムに乗ってる', en: "You're in the groove!" }
  ];

  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className={`
        relative
        animate-[bounceIn_2s_cubic-bezier(0.68,-0.55,0.265,1.55)]
        px-16 py-10 rounded-3xl
        transform rotate-2
        ${theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-2 border-gray-700/50' 
          : 'bg-gradient-to-br from-white/95 to-gray-50/95 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-2 border-gray-200/50'
        }
      `}>
        {/* Decorative elements with longer animations */}
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 rounded-full animate-[spin_4s_linear_infinite]" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-purple-400 rounded-full animate-[spin_4s_linear_infinite_reverse]" />
        <div className="absolute top-1/2 -left-3 w-4 h-4 bg-green-400 rounded-full animate-[bounce_3s_infinite]" />
        <div className="absolute top-1/2 -right-3 w-4 h-4 bg-blue-400 rounded-full animate-[bounce_3s_infinite_0.5s]" />
        
        <div className="relative">
          <div className={`
            text-6xl font-bold mb-6 text-center
            animate-[rubberBand_2s_ease-in-out]
            ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
          `}>
            {message.ja}
          </div>
          <div className={`
            text-2xl font-medium text-center
            animate-[fadeInUp_2s_ease-out_0.5s_both]
            ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}
          `}>
            {message.en}
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the ConfirmationModal component
const ConfirmationModal = ({ show, onConfirm, onCancel, theme }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className={`
        relative w-[90%] max-w-md p-6 rounded-2xl shadow-xl
        animate-[bounceIn_0.5s_cubic-bezier(0.68,-0.55,0.265,1.55)]
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
      `}>
        <div className={`text-xl font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Wait! Are you sure?
        </div>
        
        <div className={`mb-6 space-y-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-sm">
            If you just want to see the celebration animation again:
          </p>
          <div className="pl-4 space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Read another article to see it again! 
            </p>
            <p className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Keep your progress tracked 📈
            </p>
            <p className="flex items-center gap-2">
              <span className="text-green-500"></span>
              Build your reading streak 🔥
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium">
              Unfinishing this article will:
            </p>
            <div className="pl-4 mt-2 space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-red-500">•</span>
                Remove it from your finished articles
              </p>
              <p className="flex items-center gap-2">
                <span className="text-red-500">•</span>
                Reset your progress for this article
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${theme === 'dark' 
                ? 'bg-green-600 text-white hover:bg-green-500' 
                : 'bg-green-500 text-white hover:bg-green-400'
              }
            `}
          >
            Keep it! 🌟
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${theme === 'dark'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
              }
            `}
          >
            Unfinish Article
          </button>
        </div>
      </div>
    </div>
  );
};

// Add NHKLogo component
const NHKLogo = ({ className, theme }) => (
  <img 
    src="/icons/NHK_logo_2020.png" 
    alt="NHK" 
    className={`h-4 w-auto ${className} ${theme === 'dark' ? 'brightness-[1.5] contrast-[1.2] grayscale invert opacity-90' : ''}`}
  />
);

// Add MainichiLogo component
const MainichiLogo = ({ className, theme }) => (
  <img 
    src="/icons/Mainichi_logo_2024.png" 
    alt="Mainichi" 
    className={`h-4 w-auto ${className} ${theme === 'dark' ? 'brightness-[1.5] contrast-[1.2] grayscale invert opacity-90' : ''}`}
  />
);

export {
  LoadingIndicator,
  RubyText,
  processContent,
  RepeatIcon,
  SavedNewsList,
  MotivationalMessage,
  ConfirmationModal,
  NHKLogo,
  MainichiLogo,
  renderTitle
}