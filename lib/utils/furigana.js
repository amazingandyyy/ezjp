const kuromoji = require('kuromoji');

let tokenizer = null;

const initializeTokenizer = () => {
  if (tokenizer) return Promise.resolve(tokenizer);
  
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' })
      .build((err, _tokenizer) => {
        if (err) {
          reject(err);
          return;
        }
        tokenizer = _tokenizer;
        resolve(tokenizer);
      });
  });
};

/**
 * Generates furigana for Japanese text
 * @param {string} text - The Japanese text to process
 * @returns {Array<{text: string, reading: string}>} Array of text segments with readings
 */
const generateFurigana = async (text) => {
  const _tokenizer = await initializeTokenizer();
  const tokens = _tokenizer.tokenize(text);
  
  return tokens.map(token => {
    // Only add reading for kanji-containing words
    const hasKanji = /[\u4e00-\u9faf]/.test(token.surface_form);
    return {
      text: token.surface_form,
      reading: hasKanji ? token.reading : null
    };
  });
};

module.exports = {
  generateFurigana
}; 