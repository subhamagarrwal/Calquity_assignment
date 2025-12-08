import React from 'react';

// InfoCard Component
interface InfoCardProps {
  title: string;
  value: string;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

function InfoCard({ title, value, icon = '📊', color = 'blue' }: InfoCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-500 text-blue-800',
    green: 'bg-green-50 border-green-500 text-green-800',
    red: 'bg-red-50 border-red-500 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    purple: 'bg-purple-50 border-purple-500 text-purple-800',
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 shadow-sm ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-bold text-lg">{title}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
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