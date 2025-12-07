'use client';

import { BarChart } from '@/components/UI/BarChart';
import { Table } from '@/components/UI/Table';
import { InfoCard } from '@/components/UI/InfoCard';
import { SourceCard } from '@/components/UI/SourceCard';
import React from 'react';

export const componentRegistry: Record<string, React.ComponentType<any>> = {
  BarChart,
  Table,
  InfoCard,
  SourceCard,
};

export function renderComponent(componentName: string, props: any) {
  const Component = componentRegistry[componentName];
  
  if (!Component) {
    console.warn(`Component ${componentName} not found in registry`);
    return null;
  }
  
  // Use React.createElement instead of JSX
  return React.createElement(Component, props);
}