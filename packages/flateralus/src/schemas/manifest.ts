import { z } from 'zod';
import { ControlSchema } from './controls';

export const manifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  controls: z.array(ControlSchema),
});
