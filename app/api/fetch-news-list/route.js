import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request) {
  try {
    // Get pagination params from search params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 12; // Default to 12 items per page
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Fetch from their news list API endpoint
    const response = await axios.get(
      "https://raw.githubusercontent.com/amazingandyyy/n/refs/heads/main/docs/news-list.json"
    );

    const newsData = response.data[0];
    
    // Transform their data format to our format
    const transformedNewsList = Object.entries(newsData).flatMap(([date, articles]) => {
      return articles.map(article => {
        const newsId = article.news_id;
        
        return {
          title: article.title,
          date: article.news_prearranged_time,
          url: `https://www3.nhk.or.jp/news/easy/${newsId}/${newsId}.html`,
          image: article.news_easy_image_uri
            ? `https://www3.nhk.or.jp/news/easy/${newsId}/${article.news_easy_image_uri}`
            : null
        };
      });
    });

    // Apply pagination
    const paginatedNewsList = transformedNewsList.slice(offset, offset + limit);

    console.log('Found news items:', paginatedNewsList.length);
    console.log('Offset:', offset, 'Limit:', limit);

    return NextResponse.json({
      success: true,
      newsList: paginatedNewsList,
      hasMore: offset + limit < transformedNewsList.length,
      total: transformedNewsList.length
    });
  } catch (error) {
    console.error('Error fetching news list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news list' },
      { status: 500 }
    );
  }
} 