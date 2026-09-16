import { useEffect, useState } from 'react';
import { formatElapsed } from '../../talks/talk-model';

interface Props {
  notes: string | undefined;
  /** Epoch ms when the talk started, or null before the first advance. */
  startedAt: number | null;
}

/** Bottom drawer: the slide's beat plus an elapsed clock. Toggled with N. */
export default function TalkNotes({ notes, startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div
      className="bb-talk-notes"
      role="complementary"
      aria-label="Speaker notes"
    >
      <div>{notes ?? '—'}</div>
      <div className="clock">
        {startedAt === null ? '0:00' : formatElapsed(now - startedAt)}
      </div>
    </div>
  );
}
