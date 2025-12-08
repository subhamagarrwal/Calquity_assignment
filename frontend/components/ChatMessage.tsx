'use client';

interface Citation {
  number: number;
  source: string;
  page: number;
  excerpt: string;
}

interface Props {
  type: 'text' | 'tool_call' | 'citation' | 'component';
  content: string;
  onCitationClick?: (source: string, page: number) => void;
}

// InfoCard Component
function InfoCard({ title, value, icon, color }: { 
  title: string; 
  value: string; 
  icon?: string; 
  color?: string 
}) {
  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-500 text-blue-900',
    green: 'bg-green-50 border-green-500 text-green-900',
    red: 'bg-red-50 border-red-500 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    purple: 'bg-purple-50 border-purple-500 text-purple-900',
    orange: 'bg-orange-50 border-orange-500 text-orange-900',
  };

  return (
    <div className={`p-5 rounded-xl border-l-4 shadow-md ${colorStyles[color || 'blue']}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{icon || '📊'}</span>
        <span className="font-bold text-lg">{title}</span>
      </div>
      <div className="text-2xl font-bold ml-12">{value}</div>
    </div>
  );
}

// MetricCard Component - With change indicator
function MetricCard({ title, value, change, color }: {
  title: string;
  value: string;
  change?: string;
  color?: string;
}) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');
  
  return (
    <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {change && (
          <span className={`text-sm font-semibold px-2 py-1 rounded ${
            isPositive ? 'bg-green-100 text-green-700' :
            isNegative ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

// BarChart Component
function BarChart({ title, data }: {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
}) {
  const maxValue = Math.max(...data.map(d => d.value));
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold mb-6 text-gray-800">{title}</h3>
      <div className="flex items-end gap-3 h-48">
        {data.map((item, idx) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor = item.color || colors[idx % colors.length];
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="text-xs font-bold text-gray-600 mb-1">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </div>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{ 
                  height: `${Math.max(height * 1.6, 8)}px`,
                  backgroundColor: barColor
                }}
              />
              <div className="text-xs font-medium text-gray-700 mt-2 text-center truncate w-full">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// LineChart Component
function LineChart({ title, data }: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold mb-6 text-gray-800">{title}</h3>
      <div className="relative h-48">
        <svg className="w-full h-full" viewBox="0 0 400 160">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="40"
              y1={20 + i * 30}
              x2="380"
              y2={20 + i * 30}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}
          
          {/* Line path */}
          <polyline
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={data.map((d, i) => {
              const x = 40 + (i / (data.length - 1)) * 340;
              const y = 140 - ((d.value - minValue) / range) * 120;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = 40 + (i / (data.length - 1)) * 340;
            const y = 140 - ((d.value - minValue) / range) * 120;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#8B5CF6" />
                <text x={x} y="155" textAnchor="middle" className="text-xs fill-gray-600">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// PieChart Component
function PieChart({ title, data }: {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
  
  let currentAngle = 0;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      ...d,
      startAngle,
      angle,
      color: d.color || colors[i % colors.length]
    };
  });

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: 100 + radius * Math.cos(rad),
      y: 100 + radius * Math.sin(rad)
    };
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold mb-4 text-gray-800">{title}</h3>
      <div className="flex items-center gap-6">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((slice, i) => {
            const start = polarToCartesian(slice.startAngle, 80);
            const end = polarToCartesian(slice.startAngle + slice.angle, 80);
            const largeArc = slice.angle > 180 ? 1 : 0;
            
            const d = [
              `M 100 100`,
              `L ${start.x} ${start.y}`,
              `A 80 80 0 ${largeArc} 1 ${end.x} ${end.y}`,
              'Z'
            ].join(' ');
            
            return (
              <path key={i} d={d} fill={slice.color} stroke="white" strokeWidth="2" />
            );
          })}
        </svg>
        <div className="space-y-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-gray-700">
                {slice.label} ({((slice.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Table Component
function Table({ title, headers, rows }: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
      <h3 className="text-lg font-bold mb-4 text-gray-800">{title}</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-purple-50">
            {headers.map((h, i) => (
              <th key={i} className="border border-purple-200 px-4 py-2 text-left font-bold text-purple-900 text-sm">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-200 px-4 py-2 text-gray-700 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// SourceCard Component
function SourceCard({ source, page, excerpt, onClick }: {
  source: string;
  page: number;
  excerpt: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-200 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📄</span>
        <span className="font-bold text-purple-900">{source}</span>
        <span className="text-xs bg-purple-200 px-2 py-0.5 rounded-full text-purple-800 font-medium">
          Page {page}
        </span>
      </div>
      <p className="text-sm text-gray-600 italic ml-7 line-clamp-2">&quot;{excerpt}&quot;</p>
    </div>
  );
}

export function ChatMessage({ type, content, onCitationClick }: Props) {
  // Tool calls
  if (type === 'tool_call') {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg my-1">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <span className="text-sm text-blue-800 font-medium">{content}</span>
      </div>
    );
  }

  // Citations
  if (type === 'citation') {
    try {
      const citation: Citation = JSON.parse(content);
      return (
        <div className="my-2">
          <SourceCard
            source={citation.source}
            page={citation.page}
            excerpt={citation.excerpt}
            onClick={() => onCitationClick?.(citation.source, citation.page)}
          />
        </div>
      );
    } catch {
      return (
        <div className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded my-1">
          <span className="text-sm text-purple-800 font-medium">📚 {content}</span>
        </div>
      );
    }
  }

  // Components
  if (type === 'component') {
    try {
      const data = JSON.parse(content);
      const componentName = data.component || data.name;
      
      return (
        <div className="my-4">
          {componentName === 'InfoCard' && <InfoCard {...data.props} />}
          {componentName === 'MetricCard' && <MetricCard {...data.props} />}
          {componentName === 'BarChart' && <BarChart {...data.props} />}
          {componentName === 'LineChart' && <LineChart {...data.props} />}
          {componentName === 'PieChart' && <PieChart {...data.props} />}
          {componentName === 'Table' && <Table {...data.props} />}
        </div>
      );
    } catch (e) {
      console.error('Failed to parse component:', e);
      return null;
    }
  }

  // Text messages
  let text = content || '';
  text = text.replace(/\[COMPONENT\].*$/s, '').trim();
  
  if (!text) return null;

  const isUser = text.startsWith('You:');
  const isAI = text.startsWith('AI:');

  // Render text with clickable citations [1], [2], etc.
  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center w-5 h-5 text-xs bg-purple-600 text-white rounded-full cursor-pointer hover:bg-purple-800 mx-0.5 transition-colors"
            title={`Click to view source ${match[1]}`}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('citation-click', { 
                detail: { number: parseInt(match[1]) }
              }));
            }}
          >
            {match[1]}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`p-4 rounded-xl my-2 ${
      isUser ? 'bg-blue-50 border-l-4 border-blue-500' :
      isAI ? 'bg-white border border-gray-200 shadow-sm' :
      'bg-white border border-gray-200'
    }`}>
      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {renderTextWithCitations(text)}
      </div>
    </div>
  );
}