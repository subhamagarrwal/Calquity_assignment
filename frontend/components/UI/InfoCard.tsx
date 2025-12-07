'use client';

interface Props {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
  description?: string;
}

export function InfoCard({
  title,
  value,
  icon = '📊',
  color = 'blue',
  description,
}: Props) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  }[color] || 'bg-gray-50 border-gray-200 text-gray-800';

  return (
    <div className={`p-4 border rounded-lg ${colorClasses}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs opacity-70 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}