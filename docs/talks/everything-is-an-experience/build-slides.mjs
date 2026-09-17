// Generates the 14 slide artboards + canvas.json for the "Everything Is an
// Experience" deck. Run: node build-slides.mjs [--placeholders]
// The .dc.html files it writes are the working files for the design canvas.
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const usePlaceholders = process.argv.includes('--placeholders');

const W = 1920, H = 1080;
const INK = '#110a08', CREAM = '#fff3e3', ORANGE = '#ff5f1f', SUN = '#ffc24a', CYAN = '#7df9ff';

// ---------------------------------------------------------------- slides
// still: flateralus animation id (image file <id>.jpg must exist unless --placeholders)
// Copy follows the Bracket Bear Voice Rules (plainspoken, specific, no
// contrastive zingers, no bits, no self-congratulation). Harrison's own lines
// from the corpus are kept verbatim.
const slides = [
  { file: 'Main', n: 1, still: 'caustics-pool', stillName: 'Caustics Pool', heavy: true,
    eyebrow: 'FIRESIDE · PORTLAND',
    head: 'EVERYTHING IS AN EXPERIENCE.',
    sub: 'Harrison Callahan · Bracket Bear',
    beats: "Title stays up while folks settle. Say hi, say what you do at Bracket Bear in one sentence, and that this talk is ten minutes." },
  { file: 'S02UX', n: 2, kind: 'book', still: 'contour-hood', stillName: 'Contour Hood',
    head: 'USER EXPERIENCE',
    sub: "Steve Krug · Don't Make Me Think · 2000",
    beats: "Ask the room what they picture when they hear 'user experience.' A website, a wireframe, a Figma file. That's where I started too, with this book. Thought's fine, thinking is encouraged. The part that stuck is the feeling: you shouldn't have to fight the thing in front of you." },
  { file: 'S03Hospitality', n: 3, still: 'block-party', stillName: 'Block Party', heavy: true,
    head: 'TEN YEARS IN HOSPITALITY.',
    sub: 'SERVER, BARTENDER, FOH MANAGER', subMono: true,
    beats: "Hold this one. Name the places. One story from a shift. Nobody there said 'user experience' and everybody was doing it. What the guest saw versus what the kitchen saw." },
  { file: 'S04Beyond', n: 4, still: 'rd-vat', stillName: 'RD Vat',
    head: 'GO BEYOND EXPECTATION.',
    sub: 'Break through mediocrity.',
    beats: "Your words from the Will Guidara post, May 2024. Two equivalent services: the differentiator is how personal the experience is. One example of a small thing that got somebody to come back." },
  { file: 'S05Experiential', n: 5, still: 'jelly-tank', stillName: 'Jelly Tank',
    head: 'THEN, EXPERIENTIAL TECHNOLOGY.',
    sub: 'More than just the look and sound, but also the feel.',
    beats: "Hold this one too. On site, production hardware, the moment it all syncs. The experience isn't the screen. It's the room, the sound, the timing, the person standing next to you." },
  { file: 'S06TouchPoint', n: 6, still: 'portal-mark', stillName: 'Portal Mark',
    head: 'EVERYTHING IS PART OF THE EXPERIENCE.',
    sub: 'This? Part of the experience. That over there? You guessed it: more experience.',
    beats: "The turn. Same rule, everywhere. Somebody on the other end experiences every one of those. Krug's rule never said 'web pages' out loud." },
  { file: 'S07Business', n: 7, kind: 'list',
    head: 'A BUSINESS.',
    items: ['THE BRAND', 'THE VOICE', 'THE PRODUCTS'],
    beats: "Bracket Bear. The tagline is 'Welcome to Bracket Bear' and the invoice got design time for the same reason the site did. Say what the invoice looks like and what it took." },
  { file: 'S08Place', n: 8, kind: 'list',
    head: 'A PLACE.',
    items: ['THE DOOR', 'THE SIGHTLINES', 'THE VOLUME'],
    beats: "Both stories were about a room. The restaurant floor, the install site. A meetup venue is one too. Fireside has been looking for a room with a big LED wall for a reason." },
  { file: 'S09Person', n: 9, kind: 'list',
    head: 'A PERSON.',
    items: ['THE VIBE', 'THE PEOPLE', 'THE ATMOSPHERE'],
    beats: "How you show up at Fireside is an experience somebody else is having. I'm not saying I'm good at it. I'm saying I think about it." },
  { file: 'S10BadUX', n: 10, still: 'rust-machine', stillName: 'Rust Machine', heavy: true,
    head: 'BAD USER EXPERIENCE IS STILL AN EXPERIENCE.',
    sub: 'They just might not come back next time.',
    beats: "The reframe. Back to the host stand: nobody designed the twenty-minute wait, and every guest felt it. Same with the invoice nobody proofread and the Slack message sent at 11pm. It gets felt either way." },
  { file: 'S11Habit', n: 11, kind: 'quote', still: 'energy-body', stillName: 'All Eyes', heavy: true, low: true,
    sub: 'Embrace this moment. Remember.<br>We are eternal, all this pain is an illusion.',
    quoteCredit: 'TOOL · PARABOLA · 2001',
    beats: "The lyric is the slide. Say the habit over it: ten years behind a bar taught you to stand where the guest stands, and you still do it on every install." },
  { file: 'S12Impression', n: 12,
    head: 'LEAVE A GREAT IMPRESSION.',
    sub: 'What will make them remember you over the next person?',
    beats: "The ask. If you want the 'better than yesterday' line, say it here, out loud." },
  { file: 'S13Thanks', n: 13, still: 'silhouette-flock', stillName: 'Silhouette Flock', light: true,
    head: 'THANKS, FIRESIDE.',
    sub: "Let's make some cool stuff together. 🤘",
    tag: '#bracketbear2026',
    beats: "Thank Terence and the Fireside crew out loud, by name. Then stop. Q&A if there's time." },
];

// ---------------------------------------------------------------- pieces
const fonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&amp;family=Archivo+Black&amp;family=JetBrains+Mono:wght@500;700&amp;family=Plus+Jakarta+Sans:wght@400;600&amp;display=swap">`;

const css = `
  body { margin: 0; background: ${INK}; }
  a { color: ${ORANGE}; } a:hover { color: ${SUN}; }
  .slide { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${INK}; color: ${CREAM}; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  .display { font-family: 'Anton', 'Impact', 'Helvetica Neue', sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.005em; line-height: 0.92; margin: 0; text-wrap: balance; }
  /* Lifts type off the animations. Dark halo under cream, light halo under ink. */
  .slide h1, .slide p, .slide .mono, .slide .display { text-shadow: 0 2px 6px rgba(17, 10, 8, 0.55), 0 12px 40px rgba(17, 10, 8, 0.45); }
  .slide.heavy h1, .slide.heavy p, .slide.heavy .mono { text-shadow: 0 2px 8px rgba(17, 10, 8, 0.95), 0 10px 30px rgba(17, 10, 8, 0.9), 0 0 90px rgba(17, 10, 8, 0.85); }
  .slide.light h1, .slide.light p, .slide.light .mono, .slide.light .display { text-shadow: 0 2px 6px rgba(255, 210, 160, 0.55), 0 12px 40px rgba(255, 190, 120, 0.4); }
  .mono { font-family: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .wordmark { font-family: 'Archivo Black', 'Helvetica Neue', sans-serif; text-transform: uppercase; letter-spacing: 0.02em; }
  .notch-8 { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
`;

const MARK = (color) => `<svg viewBox="0 0 400.89 249.73" aria-hidden="true" style="width: 34px; height: 21px; display: block; color: ${color};"><path fill="currentColor" d="m69.98,172.24v-94.76c0-4.14,3.36-7.5,7.5-7.5h15.14c1.66,0,3-1.34,3-3V3C95.62,1.34,94.28,0,92.62,0H15C6.72,0,0,6.72,0,15v219.73c0,8.28,6.72,15,15,15h77.62c1.66,0,3-1.34,3-3v-63.99c0-1.66-1.34-3-3-3h-15.14c-4.14,0-7.5-3.36-7.5-7.5Z"/><path fill="currentColor" fill-rule="evenodd" d="m174.98,117.27c12.14,16.38,20.1,28.95,19.83,56.54-.73,66.7-62.49,74.8-77.35,75.78-1.73.11-3.19-1.26-3.19-2.99v-84.29c0-1.66-1.34-3-3-3h-19.68c-1.66,0-3-1.34-3-3v-64.05c0-1.66,1.34-3,3-3h19.68c1.66,0,3-1.34,3-3V3.05c0-1.72,1.44-3.08,3.16-3,12.12.59,55.68,6.48,69.61,59.96,7.61,29.23-3.42,50.36-12.06,57.26"/><path fill="currentColor" d="m323.41,179.74h-15.14c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h77.62c8.28,0,15-6.72,15-15V15C400.89,6.72,394.18,0,385.89,0h-77.62c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h15.14c4.14,0,7.5,3.36,7.5,7.5v94.76c0,4.14-3.36,7.5-7.5,7.5Z"/><path fill="currentColor" fill-rule="evenodd" d="m225.92,117.28c-8.64-6.9-19.67-28.03-12.06-57.26C227.79,6.53,271.35.64,283.47.05c1.72-.08,3.16,1.28,3.16,3v83.21c0,1.66,1.34,3,3,3h19.68c1.66,0,3,1.34,3,3v64.05c0,1.66-1.34,3-3,3h-19.68c-1.66,0-3,1.34-3,3v84.29c0,1.73-1.46,3.11-3.19,2.99-14.86-.98-76.62-9.08-77.35-75.78-.27-27.6,7.69-40.17,19.83-56.54"/></svg>`;

const fg = (s) => (s.light ? INK : CREAM);
const fgMuted = (s) => (s.light ? 'rgba(17, 10, 8, 0.6)' : 'rgba(255, 243, 227, 0.55)');
const chrome = (s) => `
  <div style="position: absolute; top: 56px; left: 72px; right: 72px; display: flex; justify-content: space-between; align-items: center; z-index: 3;">
    <div class="mono" style="font-size: 18px; color: ${fgMuted(s)};">EVERYTHING IS AN EXPERIENCE</div>
    <div class="mono" style="font-size: 18px; color: ${fgMuted(s)};">${String(s.n).padStart(2, '0')} / ${slides.length}</div>
  </div>
  <div style="position: absolute; bottom: 56px; left: 72px; right: 72px; display: flex; justify-content: space-between; align-items: flex-end; z-index: 3;">
    <div style="display: flex; align-items: center; gap: 14px;">${MARK(fg(s))}<div class="wordmark" style="font-size: 18px; color: ${fg(s)};">BRACKET BEAR</div></div>
    ${s.still ? `<div class="mono notch-8" style="font-size: 14px; color: ${s.light ? CREAM : INK}; background: ${s.light ? INK : ORANGE}; padding: 8px 14px 7px;">FLATERALUS · ${s.stillName.toUpperCase()}</div>` : ''}
  </div>`;

const backdrop = (s) => {
  if (!s.still) return '';
  if (usePlaceholders || !existsSync(join(here, `${s.still}.jpg`))) {
    return `<div style="position: absolute; inset: 0; background: linear-gradient(160deg, #1c130e 0%, ${INK} 60%);"></div>
    <div style="position: absolute; inset: 120px 72px; border: 1px dashed rgba(255, 243, 227, 0.25); display: flex; align-items: center; justify-content: center;">
      <div class="mono" style="font-size: 20px; color: rgba(255, 243, 227, 0.42);">LIVE ANIMATION · ${s.still.toUpperCase()}</div>
    </div>`;
  }
  return `<img src="${s.still}.jpg" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;">
    ${s.light ? '' : `<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17, 10, 8, 0.25) 0%, rgba(17, 10, 8, 0.05) 45%, rgba(17, 10, 8, 0.72) 100%);"></div>`}`;
};

const headline = (s, size) => `<h1 class="display" style="font-size: ${size}px; color: ${fg(s)}; max-width: 1560px;">${s.head}</h1>`;

const body = (s) => {
  switch (s.kind) {
    case 'wireframe': return `
      <div style="position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 0 72px;">
        ${headline(s, 180)}
        <div style="width: 760px; height: 520px; border: 3px solid ${CREAM}; background: ${INK}; display: flex; flex-direction: column; justify-self: end;">
          <div style="display: flex; gap: 12px; align-items: center; height: 56px; padding: 0 20px; border-bottom: 3px solid ${CREAM};">
            <div style="width: 16px; height: 16px; border: 3px solid ${CREAM}; border-radius: 50%;"></div>
            <div style="width: 16px; height: 16px; border: 3px solid ${CREAM}; border-radius: 50%;"></div>
            <div style="width: 16px; height: 16px; border: 3px solid ${CREAM}; border-radius: 50%;"></div>
            <div style="flex: 1; height: 22px; margin-left: 12px; border: 3px solid rgba(255, 243, 227, 0.42);"></div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 24px; padding: 32px;">
            <div style="height: 150px; border: 3px solid ${ORANGE};"></div>
            <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; flex: 1;">
              <div style="border: 3px solid rgba(255, 243, 227, 0.42);"></div>
              <div style="border: 3px solid rgba(255, 243, 227, 0.42);"></div>
              <div style="border: 3px solid rgba(255, 243, 227, 0.42);"></div>
            </div>
          </div>
        </div>
      </div>`;
    case 'book': return `
      <div style="position: absolute; inset: 0; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 96px; padding: 0 72px;">
        <div style="display: flex; flex-direction: column; gap: 32px;">
          ${headline(s, 150)}
          <div class="mono" style="font-size: 22px; color: ${ORANGE};">${s.sub}</div>
          ${s.body ? `<p style="font-size: 40px; line-height: 1.3; margin: 0; font-weight: 400; color: ${CREAM}; max-width: 900px;">${s.body}</p>` : ''}
        </div>
        <img src="dont-make-me-think.jpg" alt="Don't Make Me Think, Revisited by Steve Krug" style="width: 380px; height: auto; display: block; box-shadow: 24px 24px 0 ${ORANGE};">
      </div>`;
    case 'list': return `
      <div style="position: absolute; inset: 0; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 96px; padding: 0 72px;">
        ${headline(s, 260)}
        <div style="display: flex; flex-direction: column; gap: 28px; justify-self: end; align-items: flex-start;">
          ${s.items.map((t, i) => `<div style="display: flex; align-items: center; gap: 28px;"><div class="mono" style="font-size: 20px; color: ${ORANGE};">0${i + 1}</div><div class="display" style="font-size: 96px; color: ${CREAM}; white-space: nowrap;">${t}</div></div>`).join('\n          ')}
        </div>
      </div>`;
    case 'anything': return `
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 24px; padding: 0 72px;">
        ${headline(s, 230)}
        <div class="display" style="font-size: 230px; color: ${ORANGE};">${s.sub}</div>
        ${s.quote ? `<div style="display: flex; align-items: baseline; gap: 24px; margin-top: 40px;"><div style="font-size: 32px; color: rgba(255, 243, 227, 0.6);">${s.quote}</div><div class="mono" style="font-size: 16px; color: ${ORANGE};">${s.quoteCredit}</div></div>` : ''}
      </div>`;
    case 'lyric': return `
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 0; padding: 0 72px;">
        ${headline(s, 180)}
        <div class="display" style="font-size: 180px; color: ${ORANGE};">${s.sub}</div>
        <div class="mono" style="font-size: 18px; color: ${ORANGE}; margin-top: 40px;">${s.quoteCredit}</div>
      </div>`;
    case 'quote': return `
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: ${s.low ? 'flex-end' : 'center'}; gap: 56px; padding: 0 72px ${s.low ? '150px' : '0'};">
        ${s.head ? `<div class="mono" style="font-size: 22px; color: ${ORANGE};">${s.head}</div>` : ''}
        <p style="font-size: 80px; line-height: 1.14; font-weight: 400; margin: 0; max-width: 1700px; text-wrap: pretty; color: ${CREAM};">${s.sub}</p>
        ${s.quote || s.quoteCredit ? `<div style="display: flex; align-items: baseline; gap: 24px; margin-top: 24px;">${s.quote ? `<div style="font-size: 32px; color: rgba(255, 243, 227, 0.6);">${s.quote}</div>` : ''}<div class="mono" style="font-size: 16px; color: ${ORANGE};">${s.quoteCredit}</div></div>` : ''}
      </div>`;
    default: {
      const big = s.head.length > 36 ? 170 : s.head.length > 30 ? 190 : 240;
      const sub = s.sub
        ? (s.subMono
          ? `<div class="mono" style="font-size: 26px; color: ${s.light ? INK : ORANGE};">${s.sub}</div>`
          : s.subPlaceholder
          ? `<div class="mono" style="font-size: 26px; color: ${s.light ? INK : ORANGE}; border: 2px dashed ${s.light ? INK : ORANGE}; padding: 14px 20px; align-self: flex-start;">${s.sub}</div>`
          : `<p style="font-size: 40px; line-height: 1.3; margin: 0; font-weight: 400; color: ${fg(s)}; max-width: 1640px;">${s.sub}</p>`)
        : '';
      const tag = s.tag ? `<div class="mono" style="font-size: 20px; color: ${s.light ? INK : CYAN};">${s.tag}</div>` : '';
      return `
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 40px; padding: 0 72px 150px;">
        ${s.eyebrow ? `<div class="mono" style="font-size: 22px; color: ${s.light ? INK : ORANGE};">${s.eyebrow}</div>` : ''}
        ${headline(s, big)}
        ${sub}
        ${tag}
      </div>`;
    }
  }
};

const doc = (s) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${fonts}
  <style>${css}</style>
</helmet>
<div class="slide${s.light ? ' light' : ''}${s.heavy ? ' heavy' : ''}">
  ${backdrop(s)}
  ${body(s)}
  ${chrome(s)}
</div>
</x-dc>
</body>
</html>
`;

// ---------------------------------------------------------------- write
const COLS = 4, GX = 2040, GY = 1560;
const artboards = [];
const annotations = [];
slides.forEach((s, i) => {
  writeFileSync(join(here, `${s.file}.dc.html`), doc(s));
  const x = (i % COLS) * GX, y = Math.floor(i / COLS) * GY;
  artboards.push({ file: `${s.file}.dc.html`, title: `${String(s.n).padStart(2, '0')} ${(s.head || s.sub).slice(0, 60)}`, x, y, w: W, h: H });
  annotations.push({ id: `beats-${String(s.n).padStart(2, '0')}`, x, y: y + H + 48, w: W, text: s.beats });
});
annotations.unshift({
  id: 'read-me', x: 0, y: -400, w: 1920,
  text: "EVERYTHING IS AN EXPERIENCE · Fireside · ~10 min · 13 slides\n\nThe note under each slide is a speaker beat, not a script. The voice profile only covers short-form, so the beats are prompts in your register and the narration is yours.\n\nSlide 04 carries your roles (server, bartender, FOH manager). Add the venue names in the beat if you want them on the slide.\n\nNine slides carry a Flateralus still (Caustics Pool, Contour Hood, Block Party, RD Vat, Jelly Tank, Portal Mark, Rust Machine, All Eyes, Silhouette Flock). In the live runner those play for real.",
});
// Main.dc.html is required as the entry artboard; it is the title slide.
writeFileSync(join(here, 'canvas.json'), JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2));
console.log(`wrote ${slides.length} artboards + canvas.json (${usePlaceholders ? 'placeholders' : 'stills'})`);
