# Bracket Bear Site v3: Copy

**Date:** 2026-11-22
**Spec:** `2026-11-22-bracketbear-site-v3-design.md`
**Register:** brand (`docs/brand/BRAND.md`)
**Status:** Front page reviewed. `/platforms` drafted. Other pages not started.

Written with `/bb-voice`, `/copywriting` and `/ogilvy`, then edited with
`/copy-editing` and `/stop-slop`. Front page reviewed by Harrison 2026-11-22.

---

## Front page

### Ticker

> ◆ Welcome to Bracket Bear
> ◆ Platforms and TouchDesigner apps for experiential agencies
> ◆ TD Brackets is open source
> ◆ Rooted in Pittsburgh, based in Portland
> ◆ Now booking

### 1. Hero (over Portal Mark)

- **Eyebrow:** Welcome to Bracket Bear.
- **Headline:** We build the software that keeps your installations running
  long after opening day.
- **Lede:** Bracket Bear builds two things for experiential agencies: the
  platform behind your exhibits, and the TouchDesigner apps that run on it.
  Hire us for one, or both.
- **Button:** Tell us about your project → `/contact`

Headline alternatives:

- A (above, chosen): the promise is the part an agency pays for twice, the
  months after the opening. Thirteen words, says who it's for ("your installations")
  and what they get.
- B: "Software for interactive installations, from the CMS to the
  TouchDesigner app." Describes the range; makes no promise.
- C: "Installations your team can update and check long after opening day."
  The same promise with no "we", if the hero should lead with the reader.

### 2. Two doors

**Platforms**

- **Label:** PLATFORMS
- **Headline:** Update an exhibit from a browser, and know when a machine
  goes down.
- **Body:** A Bracket Bear platform is a CMS your producers use, an agent on
  each exhibit machine that restarts the app when it crashes and reports the
  machine's health, and receivers for TouchDesigner, Unity, Unreal, Godot and
  Electron. Our founder, Harrison Callahan, led the front end of Bridge at
  Downstream and was a full-stack engineer on Gumband at Deeplocal. At
  Bracket Bear, he architected Hyperquake's Experience Platform.
- **Link:** See the three platforms → `/platforms`

**TD Brackets**

- **Label:** TD BRACKETS
- **Headline:** TouchDesigner apps you can test and review in git.
- **Body:** TD Brackets is our open-source framework for TouchDesigner. An
  app's logic is plain Python with tests that run outside TD, its network
  lives in git as text, and one command opens the app, checks it and
  measures its frame rate. We build apps on it for agencies, and you can
  build on it yourself.
- **Links:** See TD Brackets → `/td-brackets` · View on GitHub

### 3. Both

- **Label:** BOTH
- **Headline:** Hire us for the app and the platform it runs on.
- **Body:** Hyperquake's welcome wall is a TD Brackets app that gets its
  content from Hyperquake's CMS. We built the app on the wall and the
  receiver that connects it to the CMS, so when someone changes the message,
  the colors or the background video in a browser, the wall updates without
  anyone opening TouchDesigner.
- **Video caption:** Hyperquake's welcome wall: a TD Brackets app that gets
  its content from Hyperquake's CMS.
- **Button:** Tell us about your project → `/contact`

### 4. Lab and talks

- **Lab:** Simulations we build in the browser: a protoplanetary disc you
  throw planets into, a Chladni plate, and a run traced over downtown Kansas
  City. → Open the lab
- **Talks:** Everything Is an Experience: the case for putting care into
  everything a business or a personal brand puts out, from the invoices to
  the software. It runs on creative technology, as a working example of a
  presentation people remember. → See the talks

### 5. Contact

- **Headline:** Come say hello.
- **Body:** Email hello@bracketbear.com with what you're building and when it
  opens. We'll reply with questions and where we'd start.
- **Button:** Say hello → `mailto:hello@bracketbear.com`

### Bookend and footer

- **Bookend:** Welcome to Bracket Bear. We're happy you're here.
- **Footer:** Rooted in Pittsburgh, based in Portland. Now booking.

### Meta

- **Title:** Bracket Bear: platforms and TouchDesigner apps for experiential
  agencies
- **Description:** Bracket Bear builds the CMS, machine agents and
  integrations behind interactive installations, and TouchDesigner apps on TD
  Brackets, our open-source framework.

### Self-check

- **Named noun in every section** (`BRAND.md` additive rule 1): Portal Mark
  and agencies; TouchDesigner, Unity, Unreal, Godot, Electron, Bridge,
  Gumband; TD Brackets, Python, git; Hyperquake's welcome wall; the disc,
  the Chladni plate, Kansas City; hello@bracketbear.com.
- **No two consecutive headlines open with "We"** (rule 2): only the hero
  does.
- **Operator credit:** Bridge and Gumband are "built at" their companies,
  under Harrison's name. Neither company is called a client.
- **No headcount**, no claims about Hyperquake's business, and the platform
  is "Hyperquake's Experience Platform" (spec §11, settled 2026-11-22).
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y" contrasts, no
  questions answered by the next line, no pull-quote closers.

---

## `/platforms`

### 1. Header

- **Label:** PLATFORMS
- **Headline:** The CMS, the agents and the integrations behind your
  installations, built as one platform.
- **Lede:** An installation needs more than its app. Someone has to change the
  content after opening, keep the app running on its machine, and find out
  when it stops. We build the platform that does those jobs.

### 2. What's in a platform

**The CMS.** Your producers edit an exhibit's text, media, schedules and
collections in a browser. A JSON manifest defines each exhibit's fields, so
a new exhibit starts as a manifest.

**The agent.** A program on each exhibit machine starts the app, restarts it
when it crashes, syncs media with checksums, and reports CPU, memory and
uptime back to the CMS.

**The receivers.** Libraries for TouchDesigner, Unity, Unreal, Godot,
Electron, Python and C++ that hand the app its content as it changes.

### 3. Three platforms

- **Headline:** Three platforms since 2020.
- **Intro:** Our founder, Harrison Callahan, has worked on experience
  platforms for six years. Each one carried an idea into the next.

**Bridge** · Downstream · 2020–2022 · Lead front-end engineer

> Downstream built Bridge so a new installation joined the platform through a
> JSON manifest, which cut the hours it took to prototype a project. Harrison
> led the front end, moving it to Vue 3, TypeScript and Vite over a Rust back
> end.

**Gumband** · Deeplocal · 2024–2025 · Full-stack engineer

> Gumband was Deeplocal's CMS for experiential teams, built for reliability.
> Harrison worked across the platform and prototyped a TouchDesigner
> integration for building Gumband apps without code.

**Hyperquake's Experience Platform** · Bracket Bear · 2025– · Architect

> Harrison architected Hyperquake's Experience Platform: the CMS, the agent on
> each exhibit machine, and receivers for seven runtimes. It brings both
> earlier ideas together: exhibits defined by manifests, as in Bridge, and the
> TouchDesigner integration first prototyped at Gumband.

Images: Bridge and Gumband only from images the companies published (spec
§6). Hyperquake screenshots with no client or exhibit data visible.

### 4. What we build for you

- **Headline:** A platform for your agency, or the part your setup is
  missing.
- **Body:** We build a full platform, or one piece of one: an agent for your
  exhibit machines, a receiver for the runtime your team uses, or a CMS for
  your producers. If the app runs on TouchDesigner, we can build that too, on
  TD Brackets.
- **Links:** Say hello → `mailto:hello@bracketbear.com` · See TD Brackets →
  `/td-brackets`

### Meta

- **Title:** Platforms: the CMS, agents and integrations behind
  installations | Bracket Bear
- **Description:** Bracket Bear builds experience platforms for agencies: a
  CMS for producers, an agent on each exhibit machine, and receivers for
  TouchDesigner, Unity, Unreal, Godot, Electron, Python and C++.

### Self-check

- **Named nouns:** JSON manifest; CPU, memory, uptime; seven named runtimes;
  Bridge, Downstream, Vue 3, Rust; Gumband, Deeplocal, TouchDesigner; TD
  Brackets.
- **Operator credit:** Downstream built Bridge and Deeplocal had Gumband;
  Harrison's role is stated for each. Hyperquake's platform is "architected"
  by Harrison, which leaves room for the other people who committed to it.
- **Hyperquake:** what the platform is, with no client names, counts or
  claims about Hyperquake's business.
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y".
