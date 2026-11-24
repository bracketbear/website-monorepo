# Bracket Bear Site v3: Copy

**Date:** 2026-11-22
**Spec:** `2026-11-22-bracketbear-site-v3-design.md`
**Register:** brand (`docs/brand/BRAND.md`)
**Status:** Front page and `/platforms` reviewed. `/td-brackets` drafted with placeholders. `/about`, `/community` and `/contact` drafted.

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

### 4. Community

- **Label:** COMMUNITY
- **Headline:** Run with us, hear a talk, or build on TD Brackets.
- **Run club:** The Bracket Bear Run Club ran the SEGD 2026 route through
  downtown Kansas City, with coffee after. → See the route `/run`
- **Talks:** Everything Is an Experience, on care in a business and the
  creative technology that makes a talk memorable. → See the talks `/talks`
- **Lab:** Simulations we build in the browser and leave open to play with.
  → Open the lab `/lab`
- **Link:** See the community → `/community`

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

---

## `/td-brackets`

### 1. Header

- **Label:** TD BRACKETS
- **Headline:** A framework for TouchDesigner apps you can test, review and
  ship.
- **Lede:** TD Brackets is an open-source framework for building
  TouchDesigner apps. It gives each app the same layout, Python logic you can
  test without opening TD, and a network you can read in a git diff. We use
  it for client work, and it's free for yours.
- **Buttons:** View on GitHub · Read the quickstart

Headline alternative: "TouchDesigner apps with tests, a git history and a
one-command check." More specific, less of a promise.

### 2. What it does

**Python you can test.** An app's logic lives in plain Python files with
tests that run outside TouchDesigner. Portal Mark's TouchDesigner app runs 98
of them in a tenth of a second.

**A network you can review.** `tdb dump` writes the network out as text, so a
pull request shows the expression that changed or the shader that went
stale.

**One command to check an app.** `tdb td smoke` opens the app headless,
checks it and measures its frame rate at each output size the app declares.
A git hook runs it before each push.

**A new app in under a minute.** `tdb new` took `td_noise` from an empty
folder to a passing smoke check in 27 seconds.

### 3. Quickstart

```
tdb new demo
cd demo
tdb td smoke
```

(Install line to come with the release.)

### 4. Built on TD Brackets

- **Headline:** Built on TD Brackets.

**Portal Mark.** Fourteen worlds inside the Bracket Bear mark, with audio
reactivity, god rays and GPU particles, played from a Launchpad Pro.

**Hyperquake's welcome wall.** A lobby wall [PLACEHOLDER: confirm it stands
in a lobby] whose message, colors and
background video producers change from Hyperquake's CMS.

**Brick Your Face Off.** Breakout, with every brick a glass block holding one
of Portal Mark's worlds: aurora, caustics, embers or signal.

**Cyberpunk wall.** [PLACEHOLDER: one line on what it is]

**Crystal effect.** [PLACEHOLDER: one line on what it is]

**3D voxel matrix.** [PLACEHOLDER: one line on what it is]

Each card is a short looping video, with a repo link once that repo is
public.

### 5. Hire us

- **Headline:** Hire us to build your TouchDesigner app.
- **Body:** We build installations on TD Brackets for agencies: the app, its
  controls, and the checks that run before it ships. You get a project your
  own team can open, test and change after we hand it over. [PLACEHOLDER:
  confirm the hand-over is a commitment on every TD Brackets job] If the content
  has to change after opening, we build the platform for that too.
- **Links:** Say hello → `mailto:hello@bracketbear.com` · See platforms →
  `/platforms`

### Meta

- **Title:** TD Brackets: an open-source framework for TouchDesigner apps |
  Bracket Bear
- **Description:** TD Brackets gives TouchDesigner apps tested Python logic,
  a network you can review in git, and a one-command check. Open source, from
  Bracket Bear.

### Self-check

- **Facts:** from the td-brackets README and `docs/lessons-learned.md` (98
  tests in 0.1 s on td-portal; `td_noise` to a green smoke in 27 s; the
  pre-push smoke) and the td-portal and td-breakout READMEs.
- **Named nouns:** TouchDesigner, Python, git, `tdb`, Portal Mark, Launchpad
  Pro, Hyperquake, Breakout.
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y".

---

## `/about`

### 1. Header

- **Label:** ABOUT
- **Headline:** Bracket Bear is Harrison Callahan's studio for experiential
  software.
- **Lede:** Harrison started Bracket Bear in 2025, after building experience
  platforms at Downstream and Deeplocal. The
  studio builds platforms for experiential agencies and TouchDesigner apps on
  TD Brackets. It's rooted in Pittsburgh and based in Portland.

### 2. Founder

- **Headline:** Harrison Callahan, founder
- **Body:** Harrison has built websites and software since 2012, and software
  for experiential work since 2020: the front end of Bridge at Downstream,
  full-stack work on Gumband at Deeplocal, and Hyperquake's Experience Platform at
  Bracket Bear. He gives a talk on care and creative technology, Everything
  Is an Experience.
- **Link:** Full work history → portfolio
- **Image:** [PLACEHOLDER: a photo of Harrison, or none]

### 3. How we work

- **Headline:** How a project runs here
- **Intro:** Welcome to Bracket Bear is how we treat a project, from the
  first email to the invoice. The care that goes into the platform
  architecture goes into the invoice we put our name on.

**On platform work**

**Guides your team can follow.** A release that changes how your producers
work comes with an illustrated guide. We take the screenshots from a full
run on a copy of your system before you touch the real one.

**Changes checked against your real content.** Before a change to a live
platform merges, we run it read-only against the content of every exhibit
you have, so a change that would break one shows up first.

**On TouchDesigner work**

**Apps that pass their checks before they ship.** Every app we build on TD
Brackets passes its smoke check before it leaves our hands: it opens, runs
and reports its frame rate at each output size it declares.

**On both**

**Invoices you can check.** Each line on an invoice traces back to a meeting
or a commit.

### 4. Close

- **Headline:** Come say hello.
- **Button:** Say hello → `mailto:hello@bracketbear.com`

### Meta

- **Title:** About | Bracket Bear
- **Description:** Bracket Bear is Harrison Callahan's studio for
  experiential software: platforms for agencies, and TouchDesigner apps on
  TD Brackets. Rooted in Pittsburgh, based in Portland.

### Self-check

- **Facts:** dates from `apps/cms/content/work/jobs/` (first job 2012,
  Downstream 2020); the guide, the read-only audit and the invoices are from
  the Honeywell and Hyperquake work recorded in the notes. The run club from
  the route-trace spec.
- **Dropped from the old page:** "Creative Technology Partner", the Magic
  Wand Method, "artists who code, engineers who care", the three C's, and
  "more than a decade building interactive installations" (the record shows
  six years of experiential work).
- **No headcount:** "we" throughout; Harrison is the only person named.
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y".

---

## `/community`

### 1. Header

- **Label:** COMMUNITY
- **Headline:** Runs, talks and open source from Bracket Bear.
- **Lede:** Bracket Bear puts time into the experiential industry and the
  cities it works in, whether or not a project comes of it. You can run with
  us, hear a talk, build on our code, or play with the lab.

### 2. Run club

- **Headline:** Bracket Bear Run Club
- **Body:** At SEGD 2026 in Kansas City, the run club went from the Marriott
  Downtown to the Liberty Memorial and back, with coffee after. All runners
  are welcome at the next one.
- **Link:** See the route → `/run`

### 3. Talks

- **Headline:** Everything Is an Experience
- **Body:** The case for putting care into everything a business or a
  personal brand puts out, from the invoices to the software. It runs on
  creative technology, as a working example of a presentation people
  remember.
- **Link:** See the talks → `/talks`

### 4. Open source

- **Headline:** TD Brackets
- **Body:** Our framework for TouchDesigner apps is free under the MIT
  license. Use it for your own work, and send issues and pull requests.
- **Links:** View on GitHub · See TD Brackets → `/td-brackets`

### 5. The lab

- **Headline:** The lab
- **Body:** Simulations we build in the browser and leave open to play with:
  a protoplanetary disc you throw planets into, a Chladni plate, and a run
  traced over downtown Kansas City.
- **Link:** Open the lab → `/lab`

### 6. Instagram

- **Body:** We post our own creative work on Instagram. [PLACEHOLDER: handle]
- **Link:** Follow along → [PLACEHOLDER: URL]

### 7. Close

- **Headline:** Come say hello.
- **Button:** Say hello → `mailto:hello@bracketbear.com`

### Meta

- **Title:** Community | Bracket Bear
- **Description:** The Bracket Bear Run Club, talks, TD Brackets as open
  source, and the lab.

### Self-check

- **Facts:** the run from the route-trace spec and `/run` (Marriott
  Downtown to the Liberty Memorial, coffee after, all runners welcome).
- **Beliefs** (`BRAND.md`): written as what Bracket Bear gives; no sales
  push beyond the closing button; the "not for everyone" belief is not
  stated.
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y".

---

## `/contact`

### 1. Header

- **Label:** CONTACT
- **Headline:** Tell us what you're building and when it opens.
- **Lede:** A platform for your exhibits, one piece of one, or a
  TouchDesigner app: send what you know so far. We'll reply with questions
  and where we'd start.

### 2. Form

- **Fields:**
  - Name
  - Email
  - Agency or company (optional)
  - What do you need? (select)
    - A platform
    - One piece of a platform: an agent, a receiver or a CMS
    - A TouchDesigner app
    - The app and the platform it runs on
    - A talk, a run, or something else
  - When does it open? (optional)
  - Tell us about it. Hint: "The venue, the runtime, and what your team
    will change after launch."
- **Button:** Send
- **Sent:** Thanks. We'll reply from hello@bracketbear.com.
- **Failed:** That didn't send. Email hello@bracketbear.com and we'll pick it
  up from there.
- **Dropped from the old form:** project types (Augment Your Team, Deliver
  the Project, Consult & Collaborate), budget, timeline ranges, team size,
  preferred contact method, current challenges, and the 24-hour reply
  promise.

### 3. Other ways to reach us

- **Email:** hello@bracketbear.com
- **LinkedIn:** linkedin.com/company/bracketbear
- **Line:** Rooted in Pittsburgh, based in Portland.

### Meta

- **Title:** Contact | Bracket Bear
- **Description:** Tell Bracket Bear about your platform or TouchDesigner
  project. Email hello@bracketbear.com or use the form.

### Self-check

- **Named nouns:** TouchDesigner, the agent, receiver and CMS from
  `/platforms`; Pittsburgh, Portland, LinkedIn.
- **Headlines:** opens with "Tell", not "We".
- **Community:** the last option routes talk and run requests through the
  same form.
- **Stop-slop:** no em dashes, no adverbs, no "X, not Y".
