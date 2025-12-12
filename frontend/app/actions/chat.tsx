'use server';

import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { groq } from '@/lib/ai/groq';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import {
  BarChartComponent,
  PieChartComponent,
  LineChartComponent,
  DataTableComponent,
  StatCardComponent,
} from '@/components/ui/charts';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ui?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════
const tools = {
  // Bar Chart Tool
  renderBarChart: tool({
    description: 'Render a bar chart to visualize categorical data comparison',
    parameters: z.object({
      title: z.string().describe('Chart title'),
      data: z.array(
        z.object({
          name: z.string().describe('Category name'),
          value: z.number().describe('Value for this category'),
        })
      ),
      color: z.string().optional().describe('Bar color (hex code)'),
    }),
    execute: async ({ title, data, color }) => {
      return { type: 'bar_chart', title, data, color };
    },
  }),

  // Pie Chart Tool
  renderPieChart: tool({
    description: 'Render a pie chart to show proportions or percentages',
    parameters: z.object({
      title: z.string().describe('Chart title'),
      data: z.array(
        z.object({
          name: z.string().describe('Segment name'),
          value: z.number().describe('Value for this segment'),
        })
      ),
    }),
    execute: async ({ title, data }) => {
      return { type: 'pie_chart', title, data };
    },
  }),

  // Line Chart Tool
  renderLineChart: tool({
    description: 'Render a line chart to show trends over time',
    parameters: z.object({
      title: z.string().describe('Chart title'),
      data: z.array(
        z.object({
          name: z.string().describe('X-axis label (e.g., date, month)'),
          value: z.number().describe('Y-axis value'),
        })
      ),
      color: z.string().optional().describe('Line color (hex code)'),
    }),
    execute: async ({ title, data, color }) => {
      return { type: 'line_chart', title, data, color };
    },
  }),

  // Data Table Tool
  renderTable: tool({
    description: 'Render a data table to display structured information',
    parameters: z.object({
      title: z.string().describe('Table title'),
      headers: z.array(z.string()).describe('Column headers'),
      rows: z.array(z.array(z.union([z.string(), z.number()]))).describe('Table rows'),
    }),
    execute: async ({ title, headers, rows }) => {
      return { type: 'table', title, headers, rows };
    },
  }),

  // Stat Card Tool
  renderStatCard: tool({
    description: 'Render a stat card to highlight a key metric',
    parameters: z.object({
      title: z.string().describe('Metric name'),
      value: z.union([z.string(), z.number()]).describe('Metric value'),
      change: z.string().optional().describe('Change description (e.g., "+5% from last month")'),
      changeType: z.enum(['positive', 'negative', 'neutral']).optional(),
    }),
    execute: async ({ title, value, change, changeType }) => {
      return { type: 'stat_card', title, value, change, changeType };
    },
  }),
};

// ═══════════════════════════════════════════════════════════
// RENDER TOOL RESULT TO COMPONENT
// ═══════════════════════════════════════════════════════════
function renderToolResult(result: any): React.ReactNode {
  switch (result.type) {
    case 'bar_chart':
      return <BarChartComponent title={result.title} data={result.data} color={result.color} />;
    case 'pie_chart':
      return <PieChartComponent title={result.title} data={result.data} />;
    case 'line_chart':
      return <LineChartComponent title={result.title} data={result.data} color={result.color} />;
    case 'table':
      return <DataTableComponent title={result.title} headers={result.headers} rows={result.rows} />;
    case 'stat_card':
      return (
        <StatCardComponent
          title={result.title}
          value={result.value}
          change={result.change}
          changeType={result.changeType}
        />
      );
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN CHAT ACTION
// ═══════════════════════════════════════════════════════════
export async function chat(userMessage: string, context?: string) {
  const uiStream = createStreamableUI();
  const textStream = createStreamableValue('');

  // System prompt
  const systemPrompt = `You are a helpful AI assistant that analyzes PDF documents and creates visualizations.
When the user asks about data, statistics, or comparisons from the document, use the appropriate tool to render a visualization:
- Use renderBarChart for comparing categories
- Use renderPieChart for showing proportions/percentages
- Use renderLineChart for trends over time
- Use renderTable for structured data
- Use renderStatCard for highlighting key metrics

Context from uploaded PDF:
${context || 'No document uploaded yet.'}

Always explain your findings before rendering visualizations.`;

  // Start streaming
  (async () => {
    try {
      const result = await streamText({
        model: groq('llama-3.1-70b-versatile'),
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tools,
        maxSteps: 5, // Allow multiple tool calls
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            textStream.update(chunk.textDelta);
          }
        },
        onStepFinish: ({ toolResults }) => {
          if (toolResults) {
            for (const toolResult of toolResults) {
              const component = renderToolResult(toolResult.result);
              if (component) {
                uiStream.append(component);
              }
            }
          }
        },
      });

      // Wait for completion
      await result.text;
      textStream.done();
      uiStream.done();
    } catch (error) {
      console.error('Chat error:', error);
      textStream.error(error);
      uiStream.error(error);
    }
  })();

  return {
    text: textStream.value,
    ui: uiStream.value,
  };
}

// ═══════════════════════════════════════════════════════════
// ANALYZE PDF ACTION
// ═══════════════════════════════════════════════════════════
export async function analyzePDF(query: string, pdfContext: string) {
  const uiStream = createStreamableUI();
  const textStream = createStreamableValue('');

  const systemPrompt = `You are a data analyst AI. Analyze the following PDF content and answer questions.
When you find numerical data, statistics, or comparisons, automatically render appropriate visualizations.

PDF Content:
${pdfContext}

Instructions:
1. First, provide a text explanation
2. Then, if applicable, render charts/tables using the available tools
3. Be concise but thorough`;

  (async () => {
    try {
      // Show loading state
      uiStream.update(
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
          Analyzing document...
        </div>
      );

      const result = await streamText({
        model: groq('llama-3.1-70b-versatile'),
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
        tools,
        maxSteps: 5,
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            textStream.update(chunk.textDelta);
          }
        },
        onStepFinish: ({ toolResults }) => {
          if (toolResults) {
            for (const toolResult of toolResults) {
              const component = renderToolResult(toolResult.result);
              if (component) {
                uiStream.append(
                  <div className="mt-4">
                    {component}
                  </div>
                );
              }
            }
          }
        },
      });

      await result.text;
      textStream.done();
      uiStream.done();
    } catch (error) {
      console.error('Analyze error:', error);
      textStream.error(error);
      uiStream.done(
        <div className="text-red-500">Error analyzing document: {String(error)}</div>
      );
    }
  })();

  return {
    text: textStream.value,
    ui: uiStream.value,
  };
}