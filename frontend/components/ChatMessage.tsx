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
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl text-gray-400">{icon || '📊'}</span>
        <span className="font-medium text-gray-500 text-sm uppercase tracking-wide">{title}</span>
      </div>
      <div className="text-3xl font-semibold text-gray-900 ml-9">{value}</div>
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
    <div className="p-5 bg-white rounded-xl border border-gray-200">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-gray-900">{value}</span>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-700' :
              isNegative ? 'bg-red-50 text-red-700' :
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
  // Minimalist monochrome palette
  const colors = ['#18181b', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold mb-6 text-gray-900 uppercase tracking-wide">{title}</h3>
      <div className="flex items-end gap-4 h-48">
        {data.map((item, idx) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor = item.color || colors[idx % colors.length];
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group">
              <div className="text-xs font-medium text-gray-500 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </div>
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(height * 1.6, 4)}px`,
                  backgroundColor: barColor
                }}
              />
              <div className="text-xs font-medium text-gray-500 mt-3 text-center truncate w-full">
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
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold mb-6 text-gray-900 uppercase tracking-wide">{title}</h3>
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
              stroke="#f4f4f5"
              strokeWidth="1"
            />
          ))}

          {/* Line path */}
          <polyline
            fill="none"
            stroke="#18181b"
            strokeWidth="2"
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
                <circle cx={x} cy={y} r="3" fill="#18181b" className="hover:r-4 transition-all" />
                <text x={x} y="155" textAnchor="middle" className="text-[10px] fill-gray-400">
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
  const colors = ['#18181b', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

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
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold mb-6 text-gray-900 uppercase tracking-wide">{title}</h3>
      <div className="flex items-center gap-8 justify-center">
        <svg width="160" height="160" viewBox="0 0 200 200">
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
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-xs text-gray-600">
                {slice.label} <span className="text-gray-400 ml-1">{((slice.value / total) * 100).toFixed(0)}%</span>
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
    <div className="p-6 bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <h3 className="text-sm font-semibold mb-4 text-gray-900 uppercase tracking-wide">{title}</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-gray-700">
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
      className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg text-gray-400">📄</span>
        <span className="font-medium text-gray-900 text-sm">{source}</span>
        <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-medium">
          Page {page}
        </span>
      </div>
      <p className="text-xs text-gray-500 italic ml-7 line-clamp-2 border-l-2 border-gray-300 pl-2">
        {excerpt}
      </p>
    </div>
  );
}

export function ChatMessage({ type, content, onCitationClick }: Props) {
  // Tool calls
  if (type === 'tool_call') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg my-2">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
        <span className="text-xs text-gray-500 font-medium">{content}</span>
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
        <div className="p-3 bg-gray-50 rounded my-1">
          <span className="text-sm text-gray-600 font-medium">📚 {content}</span>
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
        <div className="my-6">
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
            className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-200 text-gray-700 rounded-full cursor-pointer hover:bg-gray-300 mx-0.5 transition-colors align-top mt-0.5"
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

  if (isUser) {
    return (
      <div className="flex justify-end my-4">
        <div className="bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {renderTextWithCitations(text.replace('You: ', ''))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start my-4">
      <div className="max-w-full">
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
          {renderTextWithCitations(text.replace('AI: ', ''))}
        </div>
      </div>
    </div>
  );
}