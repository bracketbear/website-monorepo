import type { CollectionEntry } from 'astro:content';
import { Ticker, type TickerItem, BracketBearLogo } from '@bracketbear/core';

interface ServiceTickerProps {
  services: CollectionEntry<'services'>[];
  LogoComponent?: React.ComponentType<{ className?: string }>;
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