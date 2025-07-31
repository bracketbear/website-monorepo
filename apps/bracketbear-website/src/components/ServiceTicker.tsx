import type { ComponentType } from 'react';
import type { CollectionEntry } from 'astro:content';
import {
  Ticker,
  type TickerItem,
  BracketBearLogo,
} from '@bracketbear/core/react';

interface ServiceTickerProps {
  services: CollectionEntry<'services'>[];
  LogoComponent?: ComponentType<{ className?: string }>;
}

export default function ServiceTicker({
  services,
  LogoComponent,
}: ServiceTickerProps) {
  const tickerItems: TickerItem[] = services.map((service) => ({
    id: service.id,
    title: service.data.title,
    icon: LogoComponent || BracketBearLogo,
  }));

  return <Ticker items={tickerItems} />;
}
