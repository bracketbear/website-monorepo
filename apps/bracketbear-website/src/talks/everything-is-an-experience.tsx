import type { Talk } from './types';
import {
  SlideBig,
  SlideList,
  SlideBook,
  SlideWireframe,
  SlideQuote,
} from '../components/talk/layouts';

/**
 * Copy is verbatim from docs/talks/everything-is-an-experience/build-slides.mjs
 * (the storyboard canvas source). If that file changes, this one follows it.
 */
export const EVERYTHING_IS_AN_EXPERIENCE: Talk = {
  slug: 'everything-is-an-experience',
  title: 'EVERYTHING IS AN EXPERIENCE',
  slides: [
    {
      id: 'title',
      animation: { id: 'logo-resolve' },
      render: () => (
        <SlideBig
          eyebrow="FIRESIDE · PORTLAND"
          head="EVERYTHING IS AN EXPERIENCE."
          sub="Harrison Callahan · Bracket Bear"
        />
      ),
      notes:
        'Title stays up while folks settle. Say hi, say what you do at Bracket Bear in one sentence, and that this talk is ten minutes.',
    },
    {
      id: 'ux',
      render: () => <SlideWireframe head="USER EXPERIENCE" />,
      notes:
        "Ask the room what they picture when they hear 'user experience.' Most of us picture this: a website, a wireframe, a Figma file. That's where I started too.",
    },
    {
      id: 'krug',
      render: () => (
        <SlideBook
          head="DON'T MAKE ME THINK."
          credit="Steve Krug · 2000"
          body="The book is about how a website feels to use."
        />
      ),
      notes:
        "Mention it and move on. Thought's fine, thinking is encouraged. The part of the book that stuck is the feeling: you shouldn't have to fight the thing in front of you.",
    },
    {
      id: 'hospitality',
      animation: {
        id: 'sun-arc',
        controls: { city: 'pdx', labels: false, moon: false, now: false },
      },
      light: true,
      render: () => (
        <SlideBig
          head="TEN YEARS IN HOSPITALITY."
          sub="SERVER, BARTENDER, FOH MANAGER"
          mono
          light
        />
      ),
      notes:
        "Hold this one. Name the places. One story from a shift. Nobody there said 'user experience' and everybody was doing it. What the guest saw versus what the kitchen saw.",
    },
    {
      id: 'beyond',
      animation: { id: 'rd-vat' },
      render: () => (
        <SlideBig
          head="GO BEYOND EXPECTATION."
          sub="Break through mediocrity."
        />
      ),
      notes:
        'Your words from the Will Guidara post, May 2024. Two equivalent services: the differentiator is how personal the experience is. One example of a small thing that got somebody to come back.',
    },
    {
      id: 'experiential',
      animation: { id: 'jelly-tank' },
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
        />
      ),
      notes:
        'The lyric is the slide. Say the habit over it: ten years behind a bar taught you to stand where the guest stands, and you still do it on every install.',
    },
    {
      id: 'impression',
      render: () => (
        <SlideBig
          head="LEAVE A GREAT IMPRESSION."
          sub="What will make them remember you over the next person?"
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
