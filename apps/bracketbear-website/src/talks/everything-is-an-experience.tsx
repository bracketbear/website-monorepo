import type { Talk } from './types';
import {
  SlideAsk,
  SlideBig,
  SlideList,
  SlideBook,
  SlideQuote,
} from '../components/talk/layouts';

/**
 * Copy is verbatim from docs/talks/everything-is-an-experience/build-slides.mjs
 * (the storyboard canvas source). If that file changes, this one follows it.
 */

/**
 * Slide 12 runs Ink Dissolve either way. This picks what the dye is made of.
 *
 * false — the mark dissolves and re-forms behind the headline, the same
 *   relationship every other slide has with its animation.
 * true — the line itself is the ink. The headline comes off the slide,
 *   because the words should read once, and only the question stays. The
 *   dissolve does the work: stir it and the sentence smears, leave it and it
 *   pulls itself back together.
 */
const PHRASE_IN_THE_INK = false;
export const EVERYTHING_IS_AN_EXPERIENCE: Talk = {
  slug: 'everything-is-an-experience',
  title: 'EVERYTHING IS AN EXPERIENCE',
  slides: [
    {
      id: 'title',
      animation: { id: 'caustics-pool' },
      render: () => (
        <SlideBig
          eyebrow="FIRESIDE · PORTLAND"
          head="EVERYTHING IS AN EXPERIENCE."
          sub="Harrison Callahan · Bracket Bear"
          heavy
        />
      ),
      notes:
        'Title stays up while folks settle. Say hi, say what you do at Bracket Bear in one sentence, and that this talk is ten minutes.',
    },
    {
      id: 'ux',
      animation: { id: 'contour-hood', cover: 1.8 },
      render: () => (
        <SlideBook
          head="USER EXPERIENCE"
          credit="Steve Krug · Don't Make Me Think · 2000"
        />
      ),
      notes:
        "Ask the room what they picture when they hear 'user experience.' A website, a wireframe, a Figma file. That's where I started too, with this book. Thought's fine, thinking is encouraged. The part that stuck is the feeling: you shouldn't have to fight the thing in front of you.",
    },
    {
      id: 'hospitality',
      animation: { id: 'block-party', controls: { city: 'pgh' }, cover: 1.6 },
      render: () => (
        <SlideBig
          head="TEN YEARS IN HOSPITALITY."
          sub="SERVER, BARTENDER, FOH MANAGER"
          mono
          heavy
        />
      ),
      notes:
        "Hold this one. Name the places. One story from a shift. Nobody there said 'user experience' and everybody was doing it. What the guest saw versus what the kitchen saw.",
    },
    {
      id: 'beyond',
      animation: {
        id: 'rd-vat',
        // Slower reaction, seeded from noise rather than the mark.
        controls: { seedTex: 1, speed: 5 },
      },
      render: () => (
        <SlideBig
          head="GO BEYOND EXPECTATION."
          sub="Break through mediocrity."
          heavy
        />
      ),
      notes:
        'Your words from the Will Guidara post, May 2024. Two equivalent services: the differentiator is how personal the experience is. One example of a small thing that got somebody to come back.',
    },
    {
      id: 'experiential',
      animation: {
        id: 'jelly-tank',
        // Neon jelly over a city at night: violet bells, cyan highlights,
        // lavender glow, near-black navy water.
        palette: {
          ink: 0x0a0618,
          bright: 0x9b3dff,
          sun: 0x00e5ff,
          cream: 0xe8d5ff,
        },
      },
      render: () => (
        <SlideBig
          head="THEN, EXPERIENTIAL TECHNOLOGY."
          sub="More than just the look and sound, but also the feel."
        />
      ),
      notes:
        "Hold this one too. On site, production hardware, the moment it all syncs. The experience isn't the screen. It's the room, the sound, the timing, the person standing next to you.",
    },
    {
      id: 'touch-point',
      animation: { id: 'portal-mark' },
      render: () => (
        <SlideBig
          head="EVERYTHING IS PART OF THE EXPERIENCE."
          sub="This? Part of the experience. That over there? You guessed it: more experience."
        />
      ),
      notes:
        "The turn. Same rule, everywhere. Somebody on the other end experiences every one of those. Krug's rule never said 'web pages' out loud.",
    },
    {
      id: 'business',
      render: () => (
        <SlideList
          head="A BUSINESS."
          items={['THE BRAND', 'THE VOICE', 'THE PRODUCTS']}
        />
      ),
      notes:
        "Bracket Bear. The tagline is 'Welcome to Bracket Bear' and the invoice got design time for the same reason the site did. Say what the invoice looks like and what it took.",
    },
    {
      id: 'place',
      render: () => (
        <SlideList
          head="A PLACE."
          items={['THE DOOR', 'THE SIGHTLINES', 'THE VOLUME']}
        />
      ),
      notes:
        'Both stories were about a room. The restaurant floor, the install site. A meetup venue is one too. Fireside has been looking for a room with a big LED wall for a reason.',
    },
    {
      id: 'person',
      render: () => (
        <SlideList
          head="A PERSON."
          items={['THE INTRO', 'THE REPLY TIME', 'THE FOLLOW-UP']}
        />
      ),
      notes:
        "How you show up at Fireside is an experience somebody else is having. I'm not saying I'm good at it. I'm saying I think about it.",
    },
    {
      id: 'bad-ux',
      animation: { id: 'rust-machine' },
      render: () => (
        <SlideBig
          head="BAD USER EXPERIENCE IS STILL AN EXPERIENCE."
          sub="They just might not come back next time."
        />
      ),
      notes:
        'The reframe. Back to the host stand: nobody designed the twenty-minute wait, and every guest felt it. Same with the invoice nobody proofread and the Slack message sent at 11pm. It gets felt either way.',
    },
    {
      id: 'habit',
      animation: { id: 'energy-body' },
      render: () => (
        <SlideQuote
          text={
            'Embrace this moment. Remember.\nWe are eternal, all this pain is an illusion.'
          }
          quoteCredit="TOOL · PARABOLA · 2001"
          heavy
          low
        />
      ),
      notes:
        'The lyric is the slide. Say the habit over it: ten years behind a bar taught you to stand where the guest stands, and you still do it on every install.',
    },
    {
      id: 'impression',
      // Ambient, so the ink keeps moving without anyone touching the mouse,
      // and gentler than the lab default: the subject should drift and
      // re-form rather than churn. When the line is the ink it gets quieter
      // still and re-forms harder, because letterforms go illegible long
      // before the mark does.
      animation: {
        id: 'ink-dissolve',
        controls: PHRASE_IN_THE_INK
          ? {
              subject: 'phrase',
              phrase: 'LEAVE A GREAT IMPRESSION.',
              mode: 0,
              // Letterforms go illegible long before the mark does, so the
              // stirrer is gentle and the bursts are the smallest the
              // control allows. Re-form and body stay near their defaults:
              // pushed much past them the dye saturates the whole tank and
              // the words disappear into the flood.
              stir: 0.5,
              vort: 9,
              reform: 1.9,
              body: 0.995,
              burst: 150,
            }
          : { mode: 0, stir: 0.7, vort: 11, reform: 1.1 },
      },
      render: () =>
        PHRASE_IN_THE_INK ? (
          <SlideAsk sub="What will make them remember you over the next person?" />
        ) : (
          <SlideBig
            head="LEAVE A GREAT IMPRESSION."
            sub="What will make them remember you over the next person?"
            heavy
          />
        ),
      notes:
        "The ask. If you want the 'better than yesterday' line, say it here, out loud.",
    },
    {
      id: 'thanks',
      animation: { id: 'silhouette-flock' },
      light: true,
      render: () => (
        <SlideBig
          head="THANKS, FIRESIDE."
          sub="Let's make some cool stuff together. 🤘"
          tag="#bracketbear2026"
          light
        />
      ),
      notes:
        "Thank Terence and the Fireside crew out loud, by name. Then stop. Q&A if there's time.",
    },
  ],
};
