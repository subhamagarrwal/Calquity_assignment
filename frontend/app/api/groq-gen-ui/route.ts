import { groq } from '@ai-sdk/groq';
import { generateText, generateObject } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Schema for UI component generation
const UIComponentSchema = z.object({
  component: z.enum(['InfoCard', 'BarChart', 'LineChart', 'PieChart', 'Table', 'MetricCard']),
  props: z.object({
    title: z.string(),
    // For InfoCard/MetricCard
    value: z.string().optional(),
    change: z.string().optional(),
    icon: z.string().optional(),
    color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange']).optional(),
    // For Charts
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })).optional(),
    // For Table
    headers: z.array(z.string()).optional(),
    rows: z.array(z.array(z.string())).optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { query, context, imageBase64, citations } = await req.json();

    if (!query || !context) {
      return Response.json(
        { error: 'Missing query or context' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating UI component...');

    // If we have an image, use vision model for better analysis
    if (imageBase64) {
      console.log('🖼️ Using vision model for image analysis...');
      
      const { text } = await generateText({
        model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this document page and generate a visualization component.

User asked: "${query}"

Based on the image, create a JSON response for a UI component:

Available components:
1. InfoCard - For single key metrics
   {"component": "InfoCard", "props": {"title": "...", "value": "...", "icon": "📊", "color": "blue"}}

2. BarChart - For comparing values
   {"component": "BarChart", "props": {"title": "...", "data": [{"label": "Q1", "value": 100}]}}

3. LineChart - For trends over time
   {"component": "LineChart", "props": {"title": "...", "data": [{"label": "Jan", "value": 50}]}}

4. PieChart - For proportions
   {"component": "PieChart", "props": {"title": "...", "data": [{"label": "A", "value": 30}]}}

5. Table - For structured data
   {"component": "Table", "props": {"title": "...", "headers": ["Col1"], "rows": [["val1"]]}}

6. MetricCard - For key metric with change indicator
   {"component": "MetricCard", "props": {"title": "...", "value": "₹1,234 Cr", "change": "+15%", "color": "green"}}

Extract real data from the image. Respond with ONLY valid JSON.`,
              },
              {
                type: 'image',
                image: `data:image/png;base64,${imageBase64}`,
              },
            ],
          },
        ],
      });

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const componentData = JSON.parse(jsonMatch[0]);
        console.log('✅ Vision-based component generated:', componentData.component);
        return Response.json(componentData);
      }
    }

    // Fallback: Use text-based generation
    const systemPrompt = `You are a UI component generator. Based on the context and query, generate a visualization.

CONTEXT (from documents):
${context.substring(0, 2000)}

${citations ? `CITATIONS: ${JSON.stringify(citations)}` : ''}

Generate a JSON response for one of these components:

1. InfoCard - Single metric: {"component": "InfoCard", "props": {"title": "...", "value": "...", "icon": "📊", "color": "blue"}}

2. BarChart - Compare values: {"component": "BarChart", "props": {"title": "...", "data": [{"label": "Q1", "value": 100}]}}

3. LineChart - Trends: {"component": "LineChart", "props": {"title": "...", "data": [{"label": "Jan", "value": 50}]}}

4. PieChart - Proportions: {"component": "PieChart", "props": {"title": "...", "data": [{"label": "A", "value": 30, "color": "#8B5CF6"}]}}

5. Table - Structured data: {"component": "Table", "props": {"title": "...", "headers": ["Col1"], "rows": [["val1"]]}}

6. MetricCard - Key metric with change: {"component": "MetricCard", "props": {"title": "...", "value": "₹1,234 Cr", "change": "+15%", "color": "green"}}

Rules:
- Extract REAL data from context
- Choose the most appropriate component
- Use actual numbers, not placeholders
- Respond with ONLY valid JSON`;

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
    });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const componentData = JSON.parse(jsonMatch[0]);
      console.log('✅ Text-based component generated:', componentData.component);
      return Response.json(componentData);
    }

    // Fallback component
    return Response.json({
      component: 'InfoCard',
      props: {
        title: 'Analysis Complete',
        value: 'See response above',
        icon: '📊',
        color: 'blue'
      }
    });

  } catch (error: any) {
    console.error('❌ UI Generation error:', error);
    
    // Return fallback on error
    return Response.json({
      component: 'InfoCard',
      props: {
        title: 'Analysis Complete',
        value: 'View details above',
        icon: '📄',
        color: 'purple'
      }
    });
  }
}