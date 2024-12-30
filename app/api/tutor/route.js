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

// GPT-4o mini pricing per 1K tokens
const INPUT_TOKEN_COST_PER_1K = 0.00015;   // $0.150 per 1M tokens = $0.00015 per 1K tokens
const OUTPUT_TOKEN_COST_PER_1K = 0.0006;   // $0.600 per 1M tokens = $0.0006 per 1K tokens

const TUTOR_SYSTEM_PROMPT = `You are a professional Japanese language tutor helping English-speaking learners (JLPT N5-N3 level). You should be friendly and conversational, especially when answering follow-up questions.

For initial sentence analysis, format your response in clear sections using markdown:

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
- Be concise but thorough

For follow-up questions:
- Be conversational and friendly
- Start with a brief acknowledgment of the question
- Give a clear, focused answer
- Use natural language instead of formal sections
- Feel free to provide examples if helpful
- End with encouragement or invitation for more questions`;

export async function POST(request) {
  try {
    const { text, articleId, sentenceIndex, userId, followUpQuestion } = await request.json();

    if (!text || !articleId || sentenceIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const messages = [
      { role: "system", content: TUTOR_SYSTEM_PROMPT },
      { role: "user", content: `Analyze this Japanese sentence:\n${text}\n\nProvide a structured analysis focusing on grammar, vocabulary, and any cultural points.` }
    ];

    // Add follow-up question if provided
    if (followUpQuestion) {
      messages.push(
        { role: "assistant", content: "I'll be happy to help you understand more about this sentence." },
        { role: "user", content: followUpQuestion }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const explanation = completion.choices[0].message.content;
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;

    // Calculate costs in USD
    const input_cost = (prompt_tokens / 1000) * INPUT_TOKEN_COST_PER_1K;
    const output_cost = (completion_tokens / 1000) * OUTPUT_TOKEN_COST_PER_1K;
    const total_cost = input_cost + output_cost;

    // Insert AI tutor session into database
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
        model_name: "gpt-4o-mini-2024-07-18"
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