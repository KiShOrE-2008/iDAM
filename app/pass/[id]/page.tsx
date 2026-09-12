import React from 'react';
import { DigitalPassClient } from '@/components/web/DigitalPassClient';

export async function generateStaticParams() {
  return [
    { id: 'IDM-82931' },
    { id: 'IDM-44120' }
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DigitalPassPage({ params }: PageProps) {
  const { id } = await params;
  return <DigitalPassClient passId={id || 'IDM-82931'} />;
}
