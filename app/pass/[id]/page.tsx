import React from 'react';
import { DigitalPassClient } from '@/components/web/DigitalPassClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [
    { id: 'IDM-82931' },
    { id: 'IDM-44120' },
    { id: 'IDM-56717' },
    { id: 'IDM-94102' },
    { id: 'IDM-12049' },
    { id: 'IDM-55321' },
    { id: 'IDM-10001' },
    { id: 'IDM-10002' },
    { id: 'IDM-10003' },
    { id: 'IDM-7284' }
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DigitalPassPage({ params }: PageProps) {
  const resolvedParams = await params;
  const passId = resolvedParams?.id || 'IDM-82931';
  return <DigitalPassClient passId={passId} />;
}
