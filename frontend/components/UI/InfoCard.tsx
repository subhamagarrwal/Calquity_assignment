import React from 'react';

// InfoCard Component
interface InfoCardProps {
  title: string;
  value: string;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

function InfoCard({ title, value, icon = '📊', color = 'blue' }: InfoCardProps) {
  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900' },
    green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-900' },
    red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-900' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div 
      className={`p-6 rounded-xl border-l-8 shadow-lg ${colors.bg} ${colors.border} ${colors.text}`}
      style={{ minHeight: '100px', marginTop: '16px', marginBottom: '16px' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{icon}</span>
        <span className="font-bold text-xl">{title}</span>
      </div>
      <div className="text-2xl font-semibold mt-2 pl-12">{value}</div>
    </div>
  );
}

// Component Registry
const componentRegistry: Record<string, React.ComponentType<any>> = {
  InfoCard: InfoCard,
};

export function renderComponent(name: string, props: Record<string, any>): React.ReactNode | null {
  console.log('🔧 renderComponent called:', name, props);
  
  const Component = componentRegistry[name];
  
  if (!Component) {
    console.warn(`⚠️ Component not found: ${name}`);
    return null;
  }

  try {
    return <Component {...props} />;
  } catch (error) {
    console.error(`❌ Error rendering ${name}:`, error);
    return null;
  }
}