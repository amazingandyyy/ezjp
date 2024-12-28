import { NextResponse } from 'next/server';
import axios from 'axios';

async function fetchNHKNews(host) {
  try {
    const response = await axios.get(
      `${host}/sources/www3.nhk.or.jp/news/easy/news-list.json`
    );

    // Validate response structure
    if (!response.data || !Array.isArray(response.data) || !response.data[0]) {
      console.error('Invalid NHK news data structure');
      return [];
    }

    const newsData = response.data[0];
    if (typeof newsData !== 'object') {
      console.error('Invalid NHK news data format');
      return [];
    }
    
    return Object.entries(newsData).flatMap(([date, articles]) => {
      if (!Array.isArray(articles)) {
        console.warn(`Invalid articles format for date ${date}`);
        return [];
      }

      return articles.map(article => {
        const newsId = article.news_id;
        if (!newsId || !article.title) {
          console.warn('Missing required fields in NHK article');
          return null;
        }
        
        return {
          source: 'nhk',
          id: `nhk_${newsId}`,
          title: article.title,
          date: article.news_prearranged_time,
          url: `https://www3.nhk.or.jp/news/easy/${newsId}/${newsId}.html`,
          image: article.news_easy_image_uri
            ? `https://www3.nhk.or.jp/news/easy/${newsId}/${article.news_easy_image_uri}`
            : null,
          preview: null,
          category: null,
          raw: article // Keep raw data for debugging
        };
      }).filter(Boolean); // Remove null entries
    });
  } catch (error) {
    console.error('Error fetching NHK news:', error);
    return [];
  }
}

async function fetchMainichiNews(host) {
  try {
    const response = await axios.get(
      `${host}/sources/mainichi.jp/maisho/news-list.json`
    );

    // Validate response structure
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid Mainichi news data structure');
      return [];
    }
    
    return response.data.map(article => {
      if (!article.news_id || !article.title) {
        console.warn('Missing required fields in Mainichi article');
        return null;
      }

      // Clean the title by removing the category prefix
      let title = article.title;
      let category = article.category;

      // Extract category and clean title
      const parts = title.split('：');
      if (parts.length > 1) {
        // Get the part after the colon
        const afterColon = parts[1].trim();
        
        // Split by whitespace to separate category (if any) from title
        const categoryAndTitle = afterColon.split(/\s+/);
        if (categoryAndTitle.length > 1) {
          // Use only the actual title part, removing category
          title = categoryAndTitle.slice(1).join(' ').trim();
          // Add category if not already set
          if (!category) {
            category = categoryAndTitle[0].trim();
          }
        } else {
          // If no category, use entire part after colon
          title = afterColon;
        }
      }

      return {
        source: 'mainichi',
        id: `mainichi_${article.news_id}`,
        title: title,
        date: article.news_prearranged_time,
        url: article.news_web_url,
        image: article.news_web_image_uri,
        preview: article.preview,
        category: category,
        raw: article
      };
    }).filter(Boolean); // Remove null entries
  } catch (error) {
    console.error('Error fetching Mainichi news:', error);
    return [];
  }
}

export async function GET(request) {
  try {
    // Get pagination params from search params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 12, 1), 50); // Default 12, min 1, max 50
    const offset = Math.max(parseInt(searchParams.get('offset')) || 0, 0); // Min 0
    const source = searchParams.get('source')?.toLowerCase(); // Optional source filter

    // Validate source parameter
    if (source && !['nhk', 'mainichi'].includes(source)) {
      return NextResponse.json(
        { success: false, error: 'Invalid source parameter' },
        { status: 400 }
      );
    }

    // Get the host from the request URL
    const host = new URL(request.url).origin;

    // Fetch news from both sources
    const [nhkNews, mainichiNews] = await Promise.all([
      fetchNHKNews(host),
      fetchMainichiNews(host)
    ]);

    // Early return if both sources failed
    if (!nhkNews.length && !mainichiNews.length) {
      return NextResponse.json(
        { success: false, error: 'No news data available' },
        { status: 404 }
      );
    }

    // Combine and sort all news by date
    let allNews = [...nhkNews, ...mainichiNews].sort((a, b) => {
      // Safely parse dates with fallback
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateB.getTime()) && isNaN(dateA.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    // Filter by source if specified
    if (source) {
      allNews = allNews.filter(item => item.source === source);
    }

    // Validate offset
    if (offset >= allNews.length) {
      return NextResponse.json(
        { success: false, error: 'Offset out of range' },
        { status: 400 }
      );
    }

    // Apply pagination
    const paginatedNewsList = allNews.slice(offset, offset + limit);

    // Log for monitoring
    console.log({
      total: allNews.length,
      filtered: paginatedNewsList.length,
      offset,
      limit,
      source,
      nhkCount: nhkNews.length,
      mainichiCount: mainichiNews.length
    });

    return NextResponse.json({
      success: true,
      newsList: paginatedNewsList,
      hasMore: offset + limit < allNews.length,
      total: allNews.length,
      sources: {
        nhk: nhkNews.length,
        mainichi: mainichiNews.length
      },
      pagination: {
        offset,
        limit,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(allNews.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching news list:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch news list',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 