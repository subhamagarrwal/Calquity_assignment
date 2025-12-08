import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, query, context } = await req.json();

    if (!imageUrl && !imageBase64) {
      return Response.json(
        { error: 'Missing image data' },
        { status: 400 }
      );
    }

    const imageContent = imageBase64 
      ? `data:image/png;base64,${imageBase64}`
      : imageUrl;

    console.log('🖼️ Analyzing image with Groq Vision...');

    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this document image and extract key data for visualization.

User Query: ${query || 'Summarize the key metrics'}

Instructions:
1. Identify charts, tables, or key metrics in the image
2. Extract numerical data if present
3. Suggest the best visualization type

Respond in JSON format:
{
  "dataFound": true/false,
  "visualizationType": "bar" | "line" | "pie" | "table" | "metric",
  "title": "Chart title",
  "data": [{"label": "...", "value": number}] or for tables: {"headers": [...], "rows": [[...]]}
  "keyMetric": {"label": "...", "value": "...", "change": "+/-X%"},
  "summary": "Brief description of what was found"
}`,
            },
            {
              type: 'image',
              image: imageContent,
            },
          ],
        },
      ],
    });

    console.log('✅ Image analysis complete');

    // Parse the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        return Response.json(analysisData);
      }
    } catch {
      console.log('Could not parse JSON, returning raw text');
    }

    return Response.json({ 
      dataFound: false, 
      summary: text,
      visualizationType: 'metric'
    });

  } catch (error: any) {
    console.error('❌ Image analysis error:', error);
    return Response.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}