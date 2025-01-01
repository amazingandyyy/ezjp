import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const TUTOR_SYSTEM_PROMPT = `You are a professional language tutor helping learners understand Japanese text. You should be friendly and conversational, especially when answering follow-up questions.

IMPORTANT: You MUST respond in <LANGUAGE>. All explanations and interactions should be in <LANGUAGE>.

For initial sentence analysis, format your response in clear sections using markdown:

# Translation
A natural, easy-to-understand translation in <LANGUAGE>.

# Cultural Context
*Only include this section if there are relevant cultural elements*
- Brief explanation of cultural references
- Interesting facts or context
- Keep explanations concise and beginner-friendly

# Important Grammar Concepts
*Only include this section if there are intermediate/advanced grammar points*
- Explain each grammar point simply, avoid too simple grammar
- Include example usage if helpful
- Use sentence to explain, avoid bullet points for clarity
- Explain up to 2 grammar points

# Key Vocabulary
*Only include the most important or challenging words (max 5)*
| Word | Reading | Romaji | Meaning in <LANGUAGE> | Notes |
|------|---------|--------|----------|-------|
| 言葉 | ことば | kotoba | word | Common word |

---

Feel free to ask me if you want to learn more about any part!

Guidelines:
- Keep explanations clear and beginner-friendly
- Use proper markdown formatting with headers (#)
- Include sections only if relevant
- Focus on practical understanding
- Maintain consistent formatting
- Be concise but thorough
- ALL responses must be in <LANGUAGE>
- Always add two newlines after the vocabulary table

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
    const { text, articleId, sentenceIndex, userId, followUpQuestion, lang = 'en' } = await request.json();
    console.log('=== API Debug Info ===');
    console.log('Request params:', { text, articleId, sentenceIndex, userId, followUpQuestion, lang });

    if (!text || !articleId || sentenceIndex === undefined) {
      console.log('Missing required parameters:', { text, articleId, sentenceIndex });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const fullLanguage = LANGUAGE_MAP[lang] || LANGUAGE_MAP['en'];
    console.log('Language mapping:', { lang, fullLanguage });

    const promptWithLanguage = TUTOR_SYSTEM_PROMPT.replaceAll('<LANGUAGE>', fullLanguage);

    const messages = [
      { role: "system", content: promptWithLanguage },
      { role: "user", content: `Analyze this Japanese sentence in ${fullLanguage}:\n${text}\n\nProvide a structured analysis focusing on grammar, vocabulary, and any cultural points. Remember to respond ONLY in ${fullLanguage}.` }
    ];

    if (followUpQuestion) {
      console.log('Follow-up question:', followUpQuestion);
      const followUpSystemPrompt = `You are continuing to help the user understand Japanese text. Your role is to provide brief, natural responses that are easy to understand.

IMPORTANT RULES:
1. You MUST respond ONLY in ${fullLanguage}
2. Do not use any other language
3. Keep responses conversational (2-3 sentences)
4. Use a friendly, tutoring tone
5. No markdown formatting needed

Remember: ALL communication must be in ${fullLanguage}`;

      messages.push(
        { role: "system", content: followUpSystemPrompt },
        { role: "assistant", content: `I'll continue our discussion in ${fullLanguage}.` },
        { role: "user", content: followUpQuestion }
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
      console.error('Database insert error:', insertError);
    } else {
      console.log('Successfully inserted session into database');
    }

    console.log('=== End API Debug Info ===');

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
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
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