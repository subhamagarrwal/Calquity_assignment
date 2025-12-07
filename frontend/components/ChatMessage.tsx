'use client';

import { renderComponent } from '@/lib/component-registry';

interface Props {
  type: 'text' | 'tool_call' | 'citation' | 'component';
  content: string;
}

export function ChatMessage({ type, content }: Props) {
  // Tool calls (progress indicators)
  if (type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded animate-pulse">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-blue-800 font-medium">{content}</span>
      </div>
    );
  }

  // Citations
  if (type === 'citation') {
    return (
      <div className="p-2 bg-purple-50 border-l-4 border-purple-400 rounded">
        <span className="text-xs text-purple-800 font-medium">
          📚 {content}
        </span>
      </div>
    );
  }

  // Dynamic components
  if (type === 'component') {
    try {
      const componentData = JSON.parse(content);
      return (
        <div className="my-3">
          {renderComponent(componentData.name, componentData.props)}
        </div>
      );
    } catch (error) {
      console.error('Failed to render component:', error);
      return (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
          <span className="text-sm text-red-800">
            ⚠️ Failed to render component
          </span>
        </div>
      );
    }
  }

  // Regular text
  return (
    <div className="prose prose-sm max-w-none">
      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {content}
      </div>
    </div>
  );
}