import type { CollectionEntry } from 'astro:content';
import { Ticker, type TickerItem, BracketBearLogo } from '@bracketbear/core';

interface SkillsTickerProps {
  skills: CollectionEntry<'workSkills'>[];
  LogoComponent?: React.ComponentType<{ className?: string }>;
}

export default function SkillsTicker({
  skills,
  LogoComponent,
}: SkillsTickerProps) {
  const tickerItems: TickerItem[] = skills.map((skill) => ({
    id: skill.id,
    title: skill.data.title,
    icon: LogoComponent || BracketBearLogo,
  }));

  return <Ticker items={tickerItems} />;
}
