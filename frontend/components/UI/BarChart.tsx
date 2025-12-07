'use client';

interface Props {
  title?: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}

export function BarChart({ title, data, color = '#3B82F6' }: Props) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}