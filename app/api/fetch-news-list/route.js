import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    // Fetch from their news list API endpoint
    // const response = await axios.get('https://www3.nhk.or.jp/news/easy/news-list.json');
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
          // Construct the article URL using their news ID
          originalLink: `https://www3.nhk.or.jp/news/easy/${newsId}/${newsId}.html`,
          // Construct the image URL using their news ID and image name
          image: article.news_easy_image_uri
            ? `https://www3.nhk.or.jp/news/easy/${newsId}/${article.news_easy_image_uri}`
            : null
        };
      });
    });

    console.log('Found news items:', transformedNewsList.length);
    console.log('First item example:', transformedNewsList[0]);

    return NextResponse.json({
      success: true,
      newsList: transformedNewsList
    });
  } catch (error) {
    console.error('Error fetching news list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news list' },
      { status: 500 }
    );
  }
} 