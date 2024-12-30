import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
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

    console.log(explanation);

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Tutor API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
} 