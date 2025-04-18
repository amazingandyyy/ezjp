import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PREMIUM_LIMITS } from '@/lib/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Language code to full name mapping
const LANGUAGE_MAP = {
  'en': 'English',
  'zh-TW': 'Traditional Chinese',
  'zh-CN': 'Simplified Chinese',
  'zh': 'Chinese',
  'ko': 'Korean',
  'ja': 'Japanese',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'id': 'Indonesian',
  'ms': 'Malay',
  'es': 'Spanish',
  'pt': 'Portuguese',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'ru': 'Russian'
};

// GPT-4o mini pricing per 1K tokens
const INPUT_TOKEN_COST_PER_1K = 0.00015;   // $0.150 per 1M tokens = $0.00015 per 1K tokens
const OUTPUT_TOKEN_COST_PER_1K = 0.0006;   // $0.600 per 1M tokens = $0.0006 per 1K tokens

// const TUTOR_SYSTEM_PROMPT = `You are a professional language tutor helping learners understand Japanese text. You should be friendly and conversational, especially when answering follow-up questions.

// IMPORTANT: You MUST respond in <LANGUAGE>. All explanations and interactions should be in <LANGUAGE>.

// For initial sentence analysis, format your response in clear sections using markdown:

// # Translation
// A natural, easy-to-understand translation in <LANGUAGE>.

// # Cultural Context
// *Only include this section if there are relevant cultural elements*
// - Brief explanation of cultural references
// - Interesting facts or context
// - Keep explanations concise and beginner-friendly

// # Important Grammar Concepts
// *Only include this section if there are intermediate/advanced grammar points*
// - Explain each grammar point simply, avoid too simple grammar
// - Include example usage if helpful
// - Use sentence to explain, avoid bullet points for clarity
// - Explain up to 2 grammar points

// # Key Vocabulary
// *Only include the most important or challenging words (max 5)*
// | Word | Reading | Romaji | Meaning in <LANGUAGE> | Notes |
// |------|---------|--------|----------|-------|
// | 言葉 | ことば | kotoba | word | Common word |

// ---

// Feel free to ask me if you want to learn more about any part!

// Guidelines:
// - Keep explanations clear and beginner-friendly
// - Use proper markdown formatting with headers (#)
// - Include sections only if relevant
// - Focus on practical understanding
// - Maintain consistent formatting
// - Be concise but thorough
// - ALL responses must be in <LANGUAGE>
// - Always add two newlines after the vocabulary table

// For follow-up questions:
// - Be conversational and natural, like a friendly tutor chatting with a student
// - Keep responses short and focused (2-3 sentences is often enough)
// - Use simple, clear language
// - Avoid formal sections or markdown headers
// - Feel free to use casual expressions appropriate for <LANGUAGE>
// - If giving an example, keep it brief and relevant
// - End with a friendly encouragement or invitation for more questions
// - IMPORTANT: ALL responses must be in <LANGUAGE>`;

const TUTOR_SYSTEM_PROMPT = `You are a professional language tutor helping learners understand Japanese text. You should be friendly and conversational, especially when answering follow-up questions.

IMPORTANT: You MUST respond in <LANGUAGE>. All explanations and interactions should be in <LANGUAGE>.

1. A short "introduction" (NOT translation) to the content and provide background information or cultural context if there is any and it helps the user understand the content.

2. Point out important grammer points
* explain them in a simple and attractive way
*Use bullet points if there are multiple points*
*Start with a natural tone of here are some important grammer points to know*

3. Point out Key Vocabularies
*Only include the most important or challenging words (max 5)*

Example format:
| Word | Reading | Romaji | Meaning in <LANGUAGE> | Notes |
|------|---------|--------|----------|-------|
| 言葉 | ことば | kotoba | word | Common word |

Guidelines:
- When explain the sentence, NEVER simply translate the sentence.
- You are a Tutor not translator, provide more useful japanese curtural information and context.
- Keep explanations clear and beginner-friendly
- Use proper markdown for readibility.
- Focus on practical understanding
- Maintain consistent formatting
- Always make sure not duplicate content.
- ALL responses must be in <LANGUAGE>

For follow-up questions:
- Be conversational and natural, like a friendly tutor chatting with a student
- Keep responses short and focused (2-3 sentences is often enough)
- Use simple, clear language
- Avoid formal sections or markdown headers
- Feel free to use casual expressions appropriate for <LANGUAGE>
- If giving an example, keep it brief and relevant
- End with a friendly encouragement or invitation for more questions
- IMPORTANT: ALL responses must be in <LANGUAGE>`;


export async function POST(request) {
  try {
    const body = await request.json();
    const { text, lang = 'en', userId, articleId, sentenceIndex, followUpQuestion } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!articleId || sentenceIndex === undefined) {
      return NextResponse.json({
        error: 'Article ID and sentence index are required',
        details: 'The articleId and sentenceIndex parameters are missing'
      }, { status: 400 });
    }

    // Check usage limits for authenticated users
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role_level')
        .eq('id', userId)
        .single();

      const { data: aiTutorUsage } = await supabase
        .rpc('get_monthly_ai_tutor_usage', { user_uuid: userId });

      const monthlyLimit = profile?.role_level >= 1 ? PREMIUM_LIMITS.AI_TUTOR.PREMIUM : PREMIUM_LIMITS.AI_TUTOR.FREE;
      if (aiTutorUsage >= monthlyLimit) {
        return NextResponse.json({ 
          error: 'Monthly AI tutor limit reached',
          details: `You have used ${aiTutorUsage} out of ${monthlyLimit} AI tutor sessions this month.`
        }, { status: 429 });
      }
    }

    const fullLanguage = LANGUAGE_MAP[lang] || LANGUAGE_MAP['en'];
    const promptWithLanguage = TUTOR_SYSTEM_PROMPT.replaceAll('<LANGUAGE>', fullLanguage);

    const messages = [
      { role: "system", content: promptWithLanguage },
      { role: "user", content: `Analyze this Japanese sentence in ${fullLanguage}:\n${text}\n\nProvide a structured analysis focusing on grammar, vocabulary, and any cultural points. Remember to respond ONLY in ${fullLanguage}.` }
    ];

    if (followUpQuestion) {
      messages.push(
        { role: "system", content: `For follow-up questions, give brief, natural responses without any markdown formatting or sections. Keep answers conversational and concise (2-3 sentences). Use a friendly tone. IMPORTANT: You MUST respond in ${fullLanguage} only.` },
        { role: "assistant", content: `I'll continue helping you understand this sentence in ${fullLanguage}.` },
        { role: "user", content: `${followUpQuestion} (Please respond in ${fullLanguage})` }
      );
    }

    console.log('OpenAI request:', {
      model: "gpt-4o-mini-2024-07-18",
      messages: messages.map(m => ({ role: m.role, contentLength: m.content.length })),
      temperature: followUpQuestion ? 0.8 : 0.7,
      max_tokens: followUpQuestion ? 250 : 1000,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages,
      temperature: followUpQuestion ? 0.8 : 0.7,
      max_tokens: followUpQuestion ? 250 : 1000,
    });

    console.log('OpenAI response:', {
      content: completion.choices[0].message.content.substring(0, 100) + '...',
      usage: completion.usage
    });

    const explanation = completion.choices[0].message.content;
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;

    const input_cost = (prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K;
    const output_cost = (completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K;
    const total_cost = input_cost + output_cost;

    console.log('Usage stats:', {
      prompt_tokens,
      completion_tokens,
      total_tokens,
      costs: { input_cost, output_cost, total_cost }
    });

    const { error: insertError } = await supabase
      .from('ai_tutor_sessions')
      .insert({
        user_id: userId || null,
        article_id: articleId,
        sentence_index: sentenceIndex,
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
        input_cost: (completion.usage.prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K,
        output_cost: (completion.usage.completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K,
        total_cost: ((completion.usage.prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K) + 
                   ((completion.usage.completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K),
        is_follow_up: !!followUpQuestion,
        model_name: "gpt-4o-mini-2024-07-18",
        language: lang
      });

    if (insertError) {
      console.error('Error inserting AI tutor session:', insertError);
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate explanation',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get('lang') || 'en';
  const text = searchParams.get('text');
  const articleId = searchParams.get('articleId');
  const sentenceIndex = searchParams.get('sentenceIndex');
  const userId = searchParams.get('userId');
  const followUpQuestion = searchParams.get('followUpQuestion');

  try {
    if (!text || !articleId || sentenceIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const fullLanguage = LANGUAGE_MAP[lang] || LANGUAGE_MAP['en'];
    const promptWithLanguage = TUTOR_SYSTEM_PROMPT.replaceAll('<LANGUAGE>', fullLanguage);

    const messages = [
      { role: "system", content: promptWithLanguage },
      { role: "user", content: `Analyze this Japanese sentence in ${fullLanguage}:\n${text}\n\nProvide a structured analysis focusing on grammar, vocabulary, and any cultural points. Remember to respond ONLY in ${fullLanguage}.` }
    ];

    if (followUpQuestion) {
      messages.push(
        { role: "system", content: `For follow-up questions, give brief, natural responses without any markdown formatting or sections. Keep answers conversational and concise (2-3 sentences). Use a friendly tone. IMPORTANT: You MUST respond in ${fullLanguage} only.` },
        { role: "assistant", content: `I'll continue helping you understand this sentence in ${fullLanguage}.` },
        { role: "user", content: `${followUpQuestion} (Please respond in ${fullLanguage})` }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages,
      temperature: followUpQuestion ? 0.8 : 0.7,
      max_tokens: followUpQuestion ? 250 : 1000,
    });

    const explanation = completion.choices[0].message.content;
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;

    const input_cost = (prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K;
    const output_cost = (completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K;
    const total_cost = input_cost + output_cost;

    const { error: insertError } = await supabase
      .from('ai_tutor_sessions')
      .insert({
        user_id: userId || null,
        article_id: articleId,
        sentence_index: sentenceIndex,
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
        input_cost: (completion.usage.prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K,
        output_cost: (completion.usage.completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K,
        total_cost: ((completion.usage.prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K) + 
                   ((completion.usage.completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K),
        is_follow_up: !!followUpQuestion,
        model_name: "gpt-4o-mini-2024-07-18",
        language: lang
      });

    if (insertError) {
      console.error('Failed to insert AI tutor session:', insertError);
    }

    return NextResponse.json({ 
      explanation,
      usage: {
        input_tokens: prompt_tokens,
        output_tokens: completion_tokens,
        total_tokens: total_tokens,
        costs: {
          input_cost,
          output_cost,
          total_cost
        }
      }
    });
  } catch (error) {
    console.error('Tutor API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
} 