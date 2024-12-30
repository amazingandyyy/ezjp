import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { createJSTDate } from '@/lib/utils/date';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to extract domain from URL
const extractDomain = (url) => {
  const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/i);
  return match ? match[1] : null;
};

// Helper function to check if article needs refresh
const shouldRefreshArticle = (lastFetchedAt) => {
  if (!lastFetchedAt) return true;
  
  const lastFetched = new Date(lastFetchedAt);
  const now = new Date();
  const hoursSinceLastFetch = (now - lastFetched) / (1000 * 60 * 60);
  
  // Refresh if last fetch was more than 24 hours ago
  return hoursSinceLastFetch > 24;
};

class NHKEasyNews {
  static parseRubyText($, element) {
    const segments = [];
    
    element.contents().each((_, el) => {
      if (el.type === 'text') {
        const text = $(el).text().trim();
        if (text) {
          segments.push({
            type: 'text',
            content: text
          });
        }
      } else if (el.tagName === 'ruby') {
        const $ruby = $(el);
        const kanji = $ruby.contents().filter((_, node) => node.type === 'text').text().trim();
        const reading = $ruby.find('rt').text().trim();
        
        if (kanji && reading) {
          segments.push({
            type: 'ruby',
            kanji,
            reading
          });
        }
      }
    });
    
    return segments;
  }

  static parseTitle($) {
    const titleElement = $('.article-title');
    let processedTitle = [];
    
    if (titleElement.length) {
      processedTitle = this.parseRubyText($, titleElement);
    }

    // Fallback to og:title
    if (processedTitle.length === 0) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        const cleanTitle = ogTitle.split('|')[0].trim();
        processedTitle.push({
          type: 'text',
          content: cleanTitle
        });
      }
    }

    return processedTitle;
  }

  static parseDate($) {
    const dateElement = $('#js-article-date');
    if (!dateElement.length) return null;
    
    const dateText = dateElement.text().trim();
    const match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/);
    
    if (match) {
      const [_, year, month, day, hour, minute] = match;
      return createJSTDate(parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
    }
    
    // If no match, try to parse the date text directly
    try {
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return createJSTDate(date.toISOString()).toISOString();
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    return null;
  }

  static parseImages($) {
    const images = [];
    
    // Try og:image first
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      images.push(ogImage);
      return images;
    }
    
    // Try article images
    const mainImage = $('#js-article-main-image img').attr('src');
    if (mainImage) {
      const fullImgSrc = mainImage.startsWith('http') ? mainImage : `https://www3.nhk.or.jp${mainImage}`;
      images.push(fullImgSrc);
    }
    
    const articleImage = $('#js-article-figure img').attr('src');
    if (articleImage) {
      const fullImgSrc = articleImage.startsWith('http') ? articleImage : `https://www3.nhk.or.jp${articleImage}`;
      images.push(fullImgSrc);
    }
    
    return images;
  }

  static parseContent($) {
    const processedContent = [];
    const articleBody = $('#js-article-body');

    if (articleBody.length) {
      articleBody.find('p').each((_, paragraph) => {
        const $paragraph = $(paragraph);
        const paragraphContent = [];

        $paragraph.find('span').each((_, span) => {
          const $span = $(span);
          const $ruby = $span.find('ruby');
          
          if ($ruby.length) {
            const kanji = $ruby.contents().filter((_, node) => node.type === 'text').text().trim();
            const reading = $ruby.find('rt').text().trim();
            
            if (kanji && reading) {
              paragraphContent.push({
                type: 'ruby',
                kanji,
                reading
              });
            }
          } else {
            const text = $span.text().trim();
            if (text) {
              paragraphContent.push({
                type: 'text',
                content: text
              });
            }
          }
        });

        if (paragraphContent.length > 0) {
          processedContent.push({
            type: 'paragraph',
            content: paragraphContent
          });
        }
      });
    }

    return processedContent;
  }

  static parse($) {
    return {
      title: this.parseTitle($),
      content: this.parseContent($),
      published_date: this.parseDate($),
      images: this.parseImages($),
      source: 'nhk'
    };
  }
}

class MainichiMaisho {
  static parseJapaneseWithFurigana(text) {
    console.log('Parsing text with furigana:', text);
    const segments = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
      if (text[i] === '（') {
        // Found start of reading
        if (currentText) {
          // Find the last actual kanji portion by working backwards
          let kanjiEnd = currentText.length;
          let kanjiStart = kanjiEnd;
          
          // Work backwards to find where the actual kanji starts
          while (kanjiStart > 0 && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(currentText[kanjiStart - 1])) {
            kanjiStart--;
          }
          
          // If we found kanji characters
          if (kanjiStart < kanjiEnd) {
            // Add any text before the kanji as a text segment
            const preText = currentText.slice(0, kanjiStart).trim();
            if (preText) {
              segments.push({
                type: 'text',
                content: preText
              });
            }
            
            // Extract the kanji portion
            const kanji = currentText.slice(kanjiStart, kanjiEnd);
            currentText = '';
            i++; // Skip the opening parenthesis
            
            // Extract reading
            let reading = '';
            while (i < text.length && text[i] !== '）') {
              reading += text[i];
              i++;
            }
            
            if (reading) {
              segments.push({
                type: 'ruby',
                kanji: kanji,
                reading: reading
              });
            }
          } else {
            // No kanji found, treat as regular text
            segments.push({
              type: 'text',
              content: currentText
            });
            currentText = '';
          }
        }
      } else {
        currentText += text[i];
      }
      i++;
    }
    
    // Add any remaining text
    if (currentText) {
      segments.push({
        type: 'text',
        content: currentText
      });
    }
    
    console.log('Parsed segments:', segments);
    return segments;
  }

  static parseTitle($) {
    console.log('Parsing Mainichi title...');
    const titleElement = $('meta[name="title"]');
    console.log('Title meta found:', titleElement.length > 0);
    const rawTitle = titleElement.attr('content');
    console.log('Raw title from meta:', rawTitle);
    
    // Get the keywordline (series/category) from meta
    const keywordline = $('meta[name="cXenseParse:mai-keywordline"]').attr('content');
    console.log('Keywordline found:', keywordline);
    
    let title = rawTitle;
    let labels = [];
    
    if (!title) {
      // Fallback to h1
      title = $('h1.title, h1.article-title').text().trim();
      console.log('Fallback h1 title:', title);
    }
    
    if (title) {
      // Extract labels and clean title
      const parts = title.split('：');
      if (parts.length > 1) {
        // Add the prefix (e.g., "News2024年") to labels
        labels.push(parts[0].trim());
        
        // Get the rest of the title after the colon
        const afterColon = parts[1].trim();
        
        // Split by whitespace to separate category (if any) from title
        const categoryAndTitle = afterColon.split(/\s+/);
        if (categoryAndTitle.length > 1) {
          // Add category to labels
          labels.push(categoryAndTitle[0].trim());
          // Use only the actual title part, removing category
          title = categoryAndTitle.slice(1).join(' ').trim();
        } else {
          // If no category, use entire part after colon
          title = afterColon;
        }
      }
      
      // Add keywordline to labels if it exists and isn't already included
      if (keywordline && !labels.includes(keywordline)) {
        labels.push(keywordline);
      }
    }
    
    console.log('Processed title:', { title, labels });
    return {
      segments: this.parseJapaneseWithFurigana(title || ''),
      labels: labels
    };
  }

  static parseDate($) {
    console.log('Parsing Mainichi date...');
    const dateElement = $('meta[name="firstcreate"]');
    console.log('Date element found:', dateElement.length > 0);
    const dateStr = dateElement.attr('content');
    console.log('Raw date string:', dateStr);
    
    if (!dateStr) return null;

    // Parse the date string (expected format: YYYY-MM-DD HH:mm:ss)
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [_, year, month, day, hour, minute] = match;
      return createJSTDate(parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
    }
    
    // Fallback to direct parsing if format doesn't match
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return createJSTDate(date.toISOString()).toISOString();
      }
    } catch (e) {
      console.error('Error parsing Mainichi date:', e);
    }
    return null;
  }

  static parseImages($) {
    console.log('Parsing Mainichi images...');
    const images = [];
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log('OG image found:', ogImage);
    if (ogImage) {
      images.push(ogImage);
    }

    // Also try article images
    const articleImages = $('.article-body img').map((_, img) => $(img).attr('src')).get();
    console.log('Article images found:', articleImages);
    images.push(...articleImages);

    console.log('All images:', images);
    return images;
  }

  static parseContent($) {
    console.log('Parsing Mainichi content...');
    const processedContent = [];
    
    // Find the main article content using articledetail-body
    const articleBody = $('.articledetail-body');
    console.log('Article detail body found:', articleBody.length > 0);
    
    if (articleBody.length > 0) {
      // Log the structure
      console.log('Article body HTML structure:', articleBody.html().substring(0, 500) + '...');

      // Process each paragraph in the article body
      articleBody.children('p').each((index, paragraph) => {
        const $paragraph = $(paragraph);
        const text = $paragraph.text().trim();
        console.log(`Processing paragraph ${index + 1}:`, {
          text: text.substring(0, 100) + '...',
          classes: $paragraph.attr('class')
        });
        
        if (text) {
          const segments = this.parseJapaneseWithFurigana(text);
          if (segments.length > 0) {
            processedContent.push({
              type: 'paragraph',
              content: segments
            });
          }
        }
      });

      // If no paragraphs found directly, try getting all text content
      if (processedContent.length === 0) {
        console.log('No direct paragraphs found, trying full text content...');
        const fullText = articleBody.text().trim();
        
        // Split by double newlines to separate paragraphs
        const paragraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        console.log('Found paragraphs from full text:', paragraphs.length);
        
        paragraphs.forEach((text, index) => {
          console.log(`Processing split paragraph ${index + 1}:`, text.substring(0, 100) + '...');
          const segments = this.parseJapaneseWithFurigana(text);
          if (segments.length > 0) {
            processedContent.push({
              type: 'paragraph',
              content: segments
            });
          }
        });
      }
    }

    // If still no content, try meta description as fallback
    if (processedContent.length === 0) {
      console.log('No content found in article body, trying description...');
      const description = $('meta[name="description"]').attr('content');
      if (description) {
        const segments = this.parseJapaneseWithFurigana(description);
        if (segments.length > 0) {
          processedContent.push({
            type: 'paragraph',
            content: segments
          });
        }
      }
    }

    // Log the results
    console.log('Content parsing results:', {
      totalParagraphs: processedContent.length,
      paragraphLengths: processedContent.map(p => 
        p.content.reduce((acc, s) => acc + (s.type === 'text' ? s.content.length : s.kanji.length + s.reading.length), 0)
      ),
      preview: processedContent.map(p => 
        p.content.map(s => s.type === 'text' ? s.content : `${s.kanji}(${s.reading})`).join('')
      ).join('\n').substring(0, 200) + '...'
    });

    return processedContent;
  }

  static parse($) {
    console.log('Starting Mainichi article parsing...');
    const titleData = this.parseTitle($);
    const result = {
      title: titleData.segments,
      labels: titleData.labels,
      content: this.parseContent($),
      published_date: this.parseDate($),
      images: this.parseImages($),
      source: 'mainichi'
    };
    console.log('Finished parsing Mainichi article:', result);
    return result;
  }
}

// Extract article content based on source
const extractArticleContent = ($, sourceUrl) => {
  const domain = extractDomain(sourceUrl);
  console.log('Extracting content for domain:', domain);
  return domain === 'mainichi.jp' ? MainichiMaisho.parse($) : NHKEasyNews.parse($);
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get('source');

  if (!sourceUrl) {
    return new Response(JSON.stringify({ error: 'No source URL provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // First check if we have this article in our database
    const { data: existingArticle, error: dbError } = await supabase
      .from('articles')
      .select(`
        id,
        url,
        source_domain,
        title,
        labels,
        content,
        publish_date,
        images,
        fetch_count,
        last_fetched_at
      `)
      .eq('url', sourceUrl)
      .maybeSingle();

    // Only warn about actual errors, not "no rows found"
    if (dbError && dbError.code !== 'PGRST116') {
      console.warn('Database error:', dbError);
    }

    // If we have it and it's recent enough, return it
    if (existingArticle && !shouldRefreshArticle(existingArticle.last_fetched_at)) {
      console.log('Article found in database and is recent enough');
      
      const title = typeof existingArticle.title === 'string' 
        ? JSON.parse(existingArticle.title) 
        : existingArticle.title;
      
      const content = typeof existingArticle.content === 'string'
        ? JSON.parse(existingArticle.content)
        : existingArticle.content;

      if (!Array.isArray(title) || !Array.isArray(content)) {
        console.warn('Invalid data format in database, fetching from API');
      } else {
        // Update fetch count and last_fetched_at
        await supabase.rpc('update_article_fetch_stats', {
          article_id: existingArticle.id
        });

        return new Response(JSON.stringify({
          title,
          labels: existingArticle.labels || [],
          content,
          published_date: existingArticle.publish_date,
          images: existingArticle.images,
          source_domain: existingArticle.source_domain,
          fetch_count: existingArticle.fetch_count + 1,
          last_fetched_at: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch the article content
    console.log('Fetching article from source:', sourceUrl);
    const response = await axios.get(sourceUrl);
    const $ = cheerio.load(response.data);
    
    const {
      title,
      content,
      published_date,
      images,
      source,
      labels
    } = extractArticleContent($, sourceUrl);

    // Store in database
    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .upsert({
        url: sourceUrl,
        source_domain: extractDomain(sourceUrl),
        title: JSON.stringify(title),
        labels: labels || [],
        content: JSON.stringify(content),
        publish_date: published_date,
        images,
        fetch_count: 1,
        last_fetched_at: new Date().toISOString()
      }, {
        onConflict: 'url'
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving to database:', saveError);
      console.error('Error details:', {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint
      });
      throw saveError;
    }

    return new Response(JSON.stringify({
      title,
      labels: labels || [],
      content,
      published_date: published_date,
      images,
      source_domain: extractDomain(sourceUrl),
      fetch_count: 1,
      last_fetched_at: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch article',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 