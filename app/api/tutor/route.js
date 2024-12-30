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

// GPT-3.5-turbo-1106 pricing per 1K tokens
const INPUT_TOKEN_COST = 0.001;  // $0.001 per 1K input tokens
const OUTPUT_TOKEN_COST = 0.002; // $0.002 per 1K output tokens

const TUTOR_SYSTEM_PROMPT = `You are a professional Japanese language tutor helping English-speaking learners (JLPT N5-N3 level). Format your response in clear sections using markdown:

# Translation
A natural, easy-to-understand English translation.

# Cultural Context
*Only include this section if there are relevant cultural elements*
- Brief explanation of cultural references
- Interesting facts or context
- Keep explanations concise and beginner-friendly

# Important Grammar Concepts
*Only include this section if there are intermediate/advanced grammar points*
- Explain each grammar point simply, avoid too simple grammer
- Include example usage if helpful
- Use sentence to explain, avoid bullet points for clarity
- Explain up to 5 grammar points

# Key Vocabulary
*Only include the most important or challenging words (max 5)*
**Must be in a table format**
**Up to 5 words**
| Word | Reading | Romaji | Meaning | Notes |
|------|---------|--------|----------|-------|
| 言葉 | ことば | kotoba | word | Common word |

Guidelines:
- Keep explanations clear and beginner-friendly
- Use proper markdown formatting with headers (#)
- Include sections only if relevant
- Focus on practical understanding
- Maintain consistent formatting
- Be concise but thorough`;

export async function POST(request) {
  try {
    const { text, articleId, sentenceIndex, userId } = await request.json();

    if (!text || !articleId || sentenceIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: TUTOR_SYSTEM_PROMPT },
        { role: "user", content: `Analyze this Japanese sentence:\n${text}\n\nProvide a structured analysis focusing on grammar, vocabulary, and any cultural points.` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const explanation = completion.choices[0].message.content;
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;

    // Calculate costs in USD
    const input_cost = (prompt_tokens / 1000) * INPUT_TOKEN_COST;
    const output_cost = (completion_tokens / 1000) * OUTPUT_TOKEN_COST;
    const total_cost = input_cost + output_cost;

    // Store token usage and costs in database
    const { error: insertError } = await supabase
      .from('ai_tutor_sessions')
      .insert({
        article_id: articleId,
        sentence_index: sentenceIndex,
        user_id: userId,
        input_tokens: prompt_tokens,
        output_tokens: completion_tokens,
        total_tokens: total_tokens,
        input_cost: input_cost,
        output_cost: output_cost,
        total_cost: total_cost
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