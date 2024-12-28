#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const SITE_URL = 'https://mainichi.jp/maisho';
const OUTPUT_DIR = path.join('public', 'sources', 'mainichi.jp', 'maisho');
const ARCHIVE_DIR = path.join(OUTPUT_DIR, 'archive');
const TEMP_FILE = path.join('/tmp', 'mainichi-news-list-new.json');

// Add delay between requests to be respectful
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Configure axios with proper headers
const client = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; EasyJPNews/1.0)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
  },
  timeout: 10000,
});

// Helper function to extract text with furigana
function extractTextWithFurigana(text) {
  // Text format example: "漢字（かんじ）"
  const segments = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    if (text[i] === '（') {
      // Found start of reading
      const kanji = currentText;
      currentText = '';
      i++;
      
      // Extract reading
      let reading = '';
      while (i < text.length && text[i] !== '）') {
        reading += text[i];
        i++;
      }
      
      if (kanji) {
        segments.push({
          text: kanji,
          reading: reading
        });
      }
      currentText = '';
    } else {
      currentText += text[i];
    }
    i++;
  }
  
  // Add any remaining text
  if (currentText) {
    segments.push({
      text: currentText,
      reading: null
    });
  }
  
  return segments;
}

async function fetchArticleList() {
  const response = await client.get(SITE_URL);
  const $ = cheerio.load(response.data);
  
  const articles = [];
  // Process all articles
  $('.articlelist.is-tophorizontal li').each((_, element) => {
    const $el = $(element);
    // Skip ad elements
    if ($el.find('[id^="ad-"]').length > 0) return;
    
    const title = $el.find('.articlelist-title').text().trim();
    const link = $el.find('a').attr('href');
    const date = $el.find('.articletag-date').text().trim();
    const category = $el.find('.articlelist-shoulder').text().trim();
    const preview = $el.find('.text-ellipsis-2').text().trim();
    
    if (title && link) {
      // Convert date format from "YYYY/MM/DD HH:mm" to ISO format with JST timezone
      const parsedDate = date.replace(
        /(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})/,
        (_, year, month, day, hour, minute) => {
          // Create date in JST
          const jstDate = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour) - 9, // Convert JST to UTC by subtracting 9 hours
            parseInt(minute)
          ));
          return jstDate.toISOString();
        }
      );
      
      // Fix URL formatting - remove any duplicate domains and ensure proper path
      const cleanLink = link.replace(/^\/+/, '').replace(/^mainichi\.jp\//, '');
      const fixedLink = `https://mainichi.jp/${cleanLink}`;
      
      articles.push({
        news_id: cleanLink.split('/').pop(),
        news_prearranged_time: parsedDate,
        title: title,
        title_with_ruby: extractTextWithFurigana(title),
        news_web_url: fixedLink,
        news_web_image_uri: null,
        news_easy_image_uri: null,
        news_easy_voice_uri: null,
        news_easy_url: null,
        news_easy_html_path: null,
        news_easy_image_path: null,
        news_easy_voice_path: null,
        news_easy_pdf_path: null,
        category: category,
        preview: preview.replace(/\s+/g, ' '),  // Normalize whitespace
        preview_with_ruby: extractTextWithFurigana(preview)
      });
    }
  });
  
  return articles;
}

async function fetchArticleContent(url) {
  // Add delay between article requests
  await delay(2000);
  
  const response = await client.get(url);
  const $ = cheerio.load(response.data);
  
  // Get the main article content
  let content = '';
  $('.text-ellipsis-2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      content += text + '\n';
    }
  });
  
  return {
    content: content,
    content_with_ruby: extractTextWithFurigana(content)
  };
}

async function loadExistingNews() {
  try {
    const data = await fs.readFile(path.join(OUTPUT_DIR, 'news-list.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function compareFiles(file1, file2) {
  try {
    const content1 = await fs.readFile(file1, 'utf8');
    const content2 = await fs.readFile(file2, 'utf8');
    return content1 === content2;
  } catch (error) {
    return false;
  }
}

async function main() {
  try {
    // Create directories if they don't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    
    // Load existing news
    const existingNews = await loadExistingNews();
    const existingIds = new Set(existingNews.map(article => article.news_id));
    
    console.log('📰 Fetching article list...');
    const newArticles = await fetchArticleList();
    
    // Filter out articles we already have
    const uniqueNewArticles = newArticles.filter(article => !existingIds.has(article.news_id));
    
    if (uniqueNewArticles.length === 0) {
      console.log('📭 No new articles found.');
      return;
    }
    
    console.log(`Found ${uniqueNewArticles.length} new articles, processing...`);
    
    // Process new articles with rate limiting
    const processedNewArticles = [];
    for (const article of uniqueNewArticles) {
      try {
        const content = await fetchArticleContent(article.news_web_url);
        processedNewArticles.push({
          ...article,
          ...content,
        });
        console.log(`✓ Processed: ${article.title}`);
      } catch (error) {
        console.error(`Error processing article ${article.news_web_url}:`, error.message);
      }
      // Add delay between articles
      await delay(2000);
    }
    
    // Combine with existing articles and sort by date
    const allArticles = [...existingNews, ...processedNewArticles]
      .sort((a, b) => new Date(b.news_prearranged_time) - new Date(a.news_prearranged_time));
    
    // Save to temp file first
    await fs.writeFile(TEMP_FILE, JSON.stringify(allArticles), 'utf8');
    
    const outputPath = path.join(OUTPUT_DIR, 'news-list.json');
    const formattedOutputPath = path.join(OUTPUT_DIR, 'news-list-formatted.json');
    
    // Check if current file exists and if content is different
    const currentFileExists = await fs.access(outputPath).then(() => true).catch(() => false);
    
    if (currentFileExists) {
      const filesAreIdentical = await compareFiles(outputPath, TEMP_FILE);
      if (!filesAreIdentical) {
        // Content is different, archive the current version
        const timestamp = new Date().toISOString();
        const archivePath = path.join(ARCHIVE_DIR, `news-list_${timestamp}.json`);
        await fs.copyFile(outputPath, archivePath);
        
        // Update with new content
        await fs.rename(TEMP_FILE, outputPath);
        // Create formatted version
        const formattedContent = JSON.stringify(allArticles, null, 2);
        await fs.writeFile(formattedOutputPath, formattedContent, 'utf8');
        console.log(`📰 Added ${processedNewArticles.length} new articles and archived previous version`);
      } else {
        console.log('📭 No changes in news data.');
        await fs.unlink(TEMP_FILE);
      }
    } else {
      // First time run, just save the files
      await fs.rename(TEMP_FILE, outputPath);
      const formattedContent = JSON.stringify(allArticles, null, 2);
      await fs.writeFile(formattedOutputPath, formattedContent, 'utf8');
      console.log('📰 Initial news data saved.');
    }
    
    // Clean up old archives (keep last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const archives = await fs.readdir(ARCHIVE_DIR);
    for (const file of archives) {
      const filePath = path.join(ARCHIVE_DIR, file);
      const stats = await fs.stat(filePath);
      if (stats.mtime < twentyFourHoursAgo) {
        await fs.unlink(filePath);
      }
    }
    
  } catch (error) {
    console.error('Error fetching Mainichi news:', error);
    process.exit(1);
  }
}

main(); 