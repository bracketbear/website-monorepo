import { portfolioSingletons } from '../sites/portfolio/singletons';
import { bracketbearSingletons } from '../sites/bracketbear/singletons';

export const singletons = {
  // Portfolio site singletons
  ...portfolioSingletons,
  // Bracket Bear site singletons
  ...bracketbearSingletons,
};
