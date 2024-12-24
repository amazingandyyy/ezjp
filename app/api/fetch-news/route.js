import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import axios from 'axios';

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

// Extract article content from cheerio DOM
const extractArticleContent = ($) => {
  // Extract title with ruby text
  const titleElement = $('.article-title');
  const processedTitle = [];
  
  if (titleElement.length) {
    titleElement.contents().each((_, element) => {
      if (element.type === 'text') {
        const text = $(element).text().trim();
        if (text) {
          processedTitle.push({
            type: 'text',
            content: text
          });
        }
      } else if (element.tagName === 'ruby') {
        const $ruby = $(element);
        const kanji = $ruby.contents().filter((_, node) => node.type === 'text').text().trim();
        const reading = $ruby.find('rt').text().trim();
        
        if (kanji && reading) {
          processedTitle.push({
            type: 'ruby',
            kanji,
            reading
          });
        }
      }
    });
  }

  // If no title found in the page, try og:title as fallback
  if (processedTitle.length === 0) {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      console.log('Using og:title as fallback:', ogTitle);
      // Remove the "| NHKやさしいことばニュース | NEWS WEB EASY" part if present
      const cleanTitle = ogTitle.split('|')[0].trim();
      processedTitle.push({
        type: 'text',
        content: cleanTitle
      });
    }
  }

  // Extract date
  const dateElement = $('#js-article-date');
  let publishDate = null;
  
  if (dateElement.length) {
    const dateText = dateElement.text().trim();
    // Parse Japanese date format: YYYY年MM月DD日 HH時mm分
    const match = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/);
    if (match) {
      const [_, year, month, day, hour, minute] = match;
      publishDate = new Date(year, month - 1, day, hour, minute);
    } else {
      // Fallback to standard date parsing
      publishDate = new Date(dateText);
    }
  }
  
  // Extract images
  const images = [];
  
  // First try to get image from meta og:image
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    console.log('Found og:image:', ogImage);
    images.push(ogImage);
  }
  
  // Then try article images if no og:image found
  if (images.length === 0) {
    console.log('No og:image found, checking article images');
    // Try to get main image first
    const mainImage = $('#js-article-main-image');
    console.log('Main image element found:', mainImage.length > 0);
    
    if (mainImage.length) {
      const img = mainImage.find('img');
      console.log('Main image img tag found:', img.length > 0);
      
      if (img.length) {
        const imgSrc = img.attr('src');
        console.log('Raw image src:', imgSrc);
        // Handle both relative and absolute URLs
        const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `https://www3.nhk.or.jp${imgSrc}`;
        images.push(fullImgSrc);
      }
    }
    
    // Also try to get image from article figure if still no images
    if (images.length === 0) {
      const articleFigure = $('#js-article-figure');
      console.log('Article figure found:', articleFigure.length > 0);
      
      if (articleFigure.length) {
        const img = articleFigure.find('img');
        console.log('Article figure img tag found:', img.length > 0);
        
        if (img.length) {
          const imgSrc = img.attr('src');
          console.log('Raw article figure image src:', imgSrc);
          // Handle both relative and absolute URLs
          const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `https://www3.nhk.or.jp${imgSrc}`;
          images.push(fullImgSrc);
        }
      }
    }
  }

  console.log('Final extracted images:', images);

  // Process article content
  const articleBody = $('#js-article-body');
  const processedContent = [];

  if (articleBody.length) {
    // Process each paragraph
    articleBody.find('p').each((_, paragraph) => {
      const $paragraph = $(paragraph);
      const paragraphContent = [];

      // Process each span in the paragraph
      $paragraph.find('span').each((_, span) => {
        const $span = $(span);
        
        // Check if span contains ruby
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
          // Handle plain text
          const text = $span.text().trim();
          if (text) {
            paragraphContent.push({
              type: 'text',
              content: text
            });
          }
        }
      });

      // Only add paragraph if it has content
      if (paragraphContent.length > 0) {
        processedContent.push({
          type: 'paragraph',
          content: paragraphContent
        });
      }
    });
  }

  // Clean up empty or invalid entries
  const cleanContent = processedContent.filter(item => {
    if (item.type === 'paragraph') {
      return item.content && item.content.length > 0;
    }
    return false;
  });

  return {
    title: processedTitle,
    content: cleanContent,
    published_date: publishDate ? publishDate.toISOString() : null,
    images: images
  };
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
      .select('*')
      .eq('url', sourceUrl)
      .single();

    if (dbError) {
      console.warn('Database error:', dbError);
    }

    // If we have it and it's recent enough, return it
    if (existingArticle && !shouldRefreshArticle(existingArticle.last_fetched_at)) {
      console.log('Article found in database and is recent enough');
      
      // Parse JSON strings if they're strings
      const title = typeof existingArticle.title === 'string' 
        ? JSON.parse(existingArticle.title) 
        : existingArticle.title;
      
      const content = typeof existingArticle.content === 'string'
        ? JSON.parse(existingArticle.content)
        : existingArticle.content;

      if (!Array.isArray(title) || !Array.isArray(content)) {
        console.warn('Invalid data format in database, fetching from API');
        // Continue to API fetch
      } else {
        // Update fetch count and last_fetched_at
        await supabase.rpc('update_article_fetch_stats', {
          article_id: existingArticle.id
        });
        
        return new Response(JSON.stringify({
          title,
          content,
          published_date: existingArticle.publish_date,
          images: existingArticle.images || []
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Article not found in database or needs refresh');

    // If we don't have it or it needs refresh, fetch it
    const response = await axios.get(sourceUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract the article content
    const article = extractArticleContent($);

    // Validate article data
    if (!Array.isArray(article.title) || !Array.isArray(article.content)) {
      throw new Error('Invalid article format after extraction');
    }

    // Upsert the article in our database
    const { error: upsertError } = await supabase
      .from('articles')
      .upsert({
        url: sourceUrl,
        source_domain: extractDomain(sourceUrl),
        title: article.title,
        content: article.content,
        publish_date: article.published_date,
        images: article.images,
        last_fetched_at: new Date().toISOString(),
        fetch_count: existingArticle ? existingArticle.fetch_count + 1 : 1
      }, {
        onConflict: 'url'
      });

    if (upsertError) {
      console.error('Error upserting article:', upsertError);
    }

    return new Response(JSON.stringify({
      title: article.title,
      content: article.content,
      published_date: article.published_date,
      images: article.images
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch article',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 