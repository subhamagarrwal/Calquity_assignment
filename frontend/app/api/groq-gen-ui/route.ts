import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest } from 'next/server';

// Llama 4 multimodal models for vision tasks
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

// Enhanced schema for UI component generation
const componentPrompt = `You are a financial data visualization expert. Your job is to extract REAL numerical data from documents and create meaningful visualizations.

CRITICAL RULES:
1. Extract ACTUAL numbers, percentages, and values - NEVER use placeholder text
2. If you find financial data (revenue, profit, growth), use BarChart or MetricCard
3. If you find percentages or distributions, use PieChart  
4. If you find comparisons or multiple metrics, use Table
5. Each data point must have a real numerical value extracted from the source

Available components:

1. MetricCard - For a key metric with change indicator
   {"component": "MetricCard", "props": {"title": "Revenue Growth", "value": "₹2,34,500 Cr", "change": "+15.2%", "color": "green"}}

2. BarChart - For comparing values (MUST have 3+ real data points)
   {"component": "BarChart", "props": {"title": "Quarterly Revenue", "data": [{"label": "Q1 FY24", "value": 12500}, {"label": "Q2 FY24", "value": 14200}, {"label": "Q3 FY24", "value": 15800}]}}

3. LineChart - For trends over time with real numbers
   {"component": "LineChart", "props": {"title": "Stock Price", "data": [{"label": "Jan", "value": 2450}, {"label": "Feb", "value": 2520}]}}

4. PieChart - For proportions (values are percentages that should sum meaningfully)
   {"component": "PieChart", "props": {"title": "Revenue Mix", "data": [{"label": "Digital", "value": 45}, {"label": "Retail", "value": 30}, {"label": "Energy", "value": 25}]}}

5. Table - For structured comparisons
   {"component": "Table", "props": {"title": "Financial Metrics", "headers": ["Metric", "Value", "Change"], "rows": [["Revenue", "₹2.3L Cr", "+15%"], ["EBITDA", "₹58K Cr", "+11%"]]}}

6. InfoCard - ONLY if no numerical data exists (LAST RESORT)
   {"component": "InfoCard", "props": {"title": "Summary", "value": "Key Finding", "icon": "📊"}}

PRIORITY: BarChart > Table > MetricCard > PieChart > LineChart > InfoCard
Respond with ONLY valid JSON, no markdown or explanation.`;

export async function POST(req: NextRequest) {
  try {
    const { query, context, imageBase64, citations } = await req.json();

    if (!query || !context) {
      return Response.json(
        { error: 'Missing query or context' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating visualization with enhanced prompting...');

    // Build rich context from citations
    let citationsContext = '';
    if (citations?.length) {
      citationsContext = '\n\nSOURCE EXCERPTS:\n' + citations
        .map((c: { number: number; source: string; page: number; excerpt: string }) => 
          `[${c.number}] ${c.source} p.${c.page}: ${c.excerpt || ''}`
        )
        .join('\n');
    }

    // If we have an image, use Llama 4 vision model
    if (imageBase64) {
      console.log('🖼️ Using Llama 4 Scout for image analysis...');

      try {
        const { text } = await generateText({
          model: groq(VISION_MODEL),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${componentPrompt}

User question: "${query}"

Look at this document image and extract specific numerical data:
- Look for tables, charts, or financial figures
- Extract exact numbers, percentages, currency values
- Focus on data that answers the user's question
- Create a visualization with at least 3 real data points

Respond with ONLY valid JSON for the component.`,
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
          
          // Validate the component has real data
          const props = componentData.props || {};
          const compType = componentData.component;
          
          if (compType === 'BarChart' || compType === 'LineChart' || compType === 'PieChart') {
            const data = props.data || [];
            if (data.length >= 2 && data.every((d: {value: number}) => typeof d.value === 'number')) {
              console.log('✅ Llama 4 vision generated valid chart:', compType);
              return Response.json(componentData);
            }
          } else if (compType === 'Table') {
            const rows = props.rows || [];
            if (rows.length >= 1) {
              console.log('✅ Llama 4 vision generated table');
              return Response.json(componentData);
            }
          } else if (compType === 'MetricCard') {
            const value = props.value || '';
            if (/[\d₹$%]/.test(value)) {
              console.log('✅ Llama 4 vision generated MetricCard');
              return Response.json(componentData);
            }
          }
          
          console.log('⚠️ Vision model output invalid, falling back to text model');
        }
      } catch (visionError) {
        console.log('⚠️ Vision model failed:', visionError);
      }
    }

    // Fallback: Use text-based generation with rich context
    console.log('📝 Using text model for visualization...');
    
    const { text } = await generateText({
      model: groq(TEXT_MODEL),
      messages: [
        { role: 'system', content: componentPrompt },
        { 
          role: 'user', 
          content: `User Query: "${query}"

Document Content:
${context.substring(0, 3500)}
${citationsContext}

Extract REAL numerical data from the above content. Create a BarChart, Table, or MetricCard with actual values.
DO NOT use placeholder values like "See details" or page numbers.
Find specific numbers, percentages, or financial figures.

Generate the visualization JSON:`
        }
      ],
      temperature: 0.2,
    });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const componentData = JSON.parse(jsonMatch[0]);
      console.log('✅ Text model generated:', componentData.component);
      return Response.json(componentData);
    }

    // Ultimate fallback
    return Response.json({
      component: 'InfoCard',
      props: {
        title: 'Analysis Complete',
        value: 'View response for details',
        icon: '📄',
        color: 'blue'
      }
    });

  } catch (error: unknown) {
    console.error('❌ UI Generation error:', error);

    return Response.json({
      component: 'InfoCard',
      props: {
        title: 'Analysis Complete',
        value: 'See response above',
        icon: '📄',
        color: 'gray'
      }
    });
  }
}