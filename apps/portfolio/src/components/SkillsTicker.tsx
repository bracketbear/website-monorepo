import type { CollectionEntry } from 'astro:content';
import {
  Ticker,
  type TickerItem,
  BracketBearLogo,
} from '@bracketbear/core/react';

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
    link: `/work?skill=${skill.id}`,
  }));

  const handleItemClick = (item: TickerItem) => {
    if (item.link) {
      window.location.href = item.link;
    }
  };

  return <Ticker items={tickerItems} onItemClick={handleItemClick} />;
}
