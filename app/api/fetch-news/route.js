import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract Open Graph metadata
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogUrl = $('meta[property="og:url"]').attr('content');
    
    // Add OG image to images array if it exists
    const images = [];
    if (ogImage) {
      images.push({
        src: ogImage,
        alt: 'Article main image',
        caption: '',
      });
    }
    
    // Process title with furigana
    const titleElement = $('.article-title');
    const processedTitle = [];
    
    // Process each element in the title
    titleElement.contents().each((_, element) => {
      const el = $(element);
      
      if (el.is('ruby')) {
        // Get the kanji and its reading
        const kanji = el.contents().filter((_, node) => node.type === 'text').text().trim();
        const reading = el.find('rt').text().trim();
        
        processedTitle.push({
          type: 'ruby',
          kanji,
          reading
        });
      } else if (element.type === 'text') {
        // Regular text
        const text = $(element).text().trim();
        if (text) {
          processedTitle.push({
            type: 'text',
            content: text
          });
        }
      }
    });

    const dateText = $('#js-article-date').text().trim();
    
    // Also try to get image from article figure as fallback
    const articleFigure = $('#js-article-figure');
    if (articleFigure.length) {
      const img = articleFigure.find('img');
      const caption = articleFigure.find('figcaption').text().trim();
      
      if (img.length) {
        const imgSrc = img.attr('src');
        // Handle both relative and absolute URLs
        const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `https://www3.nhk.or.jp${imgSrc}`;
        
        images.push({
          src: fullImgSrc,
          alt: img.attr('alt') || caption,
          caption: caption,
        });
      }
    }

    const articleBody = $('#js-article-body');
    const processedContent = [];

    // Process each text node and ruby (furigana) element
    articleBody.find('*').each((_, element) => {
      const el = $(element);
      
      if (el.is('ruby')) {
        // Get the kanji and its reading
        const kanji = el.contents().filter((_, node) => node.type === 'text').text().trim();
        const reading = el.find('rt').text().trim();
        
        processedContent.push({
          type: 'ruby',
          kanji,
          reading
        });
      } else if (el.contents().length === 1 && el.contents()[0].type === 'text') {
        // Regular text
        const text = el.text().trim();
        if (text) {
          processedContent.push({
            type: 'text',
            content: text
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      title: processedTitle,
      date: dateText,
      images,
      content: processedContent,
      originalUrl: ogUrl || url // Include the OG URL if available, fallback to provided URL
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news content' },
      { status: 500 }
    );
  }
} 