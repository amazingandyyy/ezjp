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
    
    // Extract the article title and content
    const title = $('#js-article-title').text().trim();
    const content = $('#js-article-body').text().trim();
    
    return NextResponse.json({
      title,
      content,
      success: true
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news content' },
      { status: 500 }
    );
  }
} 