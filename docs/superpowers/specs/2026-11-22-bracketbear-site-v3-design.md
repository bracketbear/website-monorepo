# Bracket Bear Site v3: Structure and Positioning

**Date:** 2026-11-22
**Status:** Decisions settled in a grilling session. Copy drafted in
`2026-11-22-bracketbear-site-v3-copy.md`.
**Supersedes:** `2026-08-24-bracketbear-site-content-v2.md`, its copy draft
`2026-08-24-bracketbear-site-copy.md`, and the plan
`../plans/2026-05-03-bracketbear-homepage-rebuild.md`. Those were written while
Bracket Bear did not yet know what it was selling. Their structure, beat map
and copy do not carry over. Use them only as a record of earlier decisions.

---

## 1. Why v3 exists

The v1 and v2 sites describe a consultancy pitch built before the offer was
clear. Since then the work has settled into two things Bracket Bear actually
builds and sells, and most of what was built on `disc` since September (the
lab, talks, the run page, Portal Mark) has no place in the v2 architecture,
whose nav was About · Contact.

v3 starts from the offer, not from the old page list.

## 2. What Bracket Bear sells

Two offers. A client can hire either one, or both as one package.

| Offer           | What it is                                                                                                                                                                               | Proof                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Platforms**   | The software layer behind installations: the CMS, the machine agents, the integrations and the monitoring that let an agency update, watch and measure its exhibits after opening day.   | Three experience platforms, in order: Bridge, Gumband, the Hyperquake Experience Platform (§6). |
| **TD Brackets** | An open-source framework for building TouchDesigner apps (`bracketbear/td-brackets`: "faster, standardized, trackable"), and Bracket Bear building TouchDesigner apps on it for clients. | The apps built on it (§7).                                                                      |

**The package** is both at once: a TouchDesigner app on TD Brackets, running
on a platform Bracket Bear built. The Hyperquake welcome wall
(`bracketbear/hyperquake-welcome-wall`, a TD Brackets app that is a Conflower
receiver) is the example.

**Later: creative direction** (decided 2026-11-23). Bracket Bear intends to
own creative direction, building on its own creative vision published on
Instagram. It is not an offer at launch, because no client work stands
behind it yet. At launch the vision shows through the lab, the TD Brackets
apps and Instagram.

## 3. Audience

1. **Agency teams**: producers and technical directors at experiential
   agencies. They hire for platform and integration work. The site is
   arranged for them.
2. **Peers and community**: creative technologists, TouchDesigner users,
   SEGD, talk audiences. They find the framework, the lab and the talks, and
   send agency teams our way.

**Community is a center of gravity** (decided 2026-11-23). Bracket Bear puts
time into the experiential industry and its cities because that is what the
company is for; work arriving through it is expected, and secondary. Community
gets its own page (§5.2). The belief that goes with it, that Bracket Bear
accepts not everyone will like it, is recorded in `BRAND.md` as a guide for
decisions and never stated on the site.

## 4. Voice and identity

- The site speaks as **"we"**. Bracket Bear is one person today, and the
  intent is for it to become a studio.
- `/about` names Harrison as founder and lead.
- **Never state or imply a headcount.** No "our team of", no team photos, no
  "our engineers". This is the rule that keeps the "we" honest.
- Copy follows `docs/brand/BRAND.md` and the separate "Bracket Bear — Voice
  Rules" file (kept outside this repo; ask for it if it is not at hand). Where
  a copy skill disagrees with either, the brand docs win.

## 5. Site map

| Path           | Purpose                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Front page (§5.1)                                                                                                           |
| `/platforms`   | Offer 1. The three platforms told in order, then what we build for you.                                                     |
| `/td-brackets` | Offer 2. The framework, the apps built on it, and "we build TouchDesigner apps for you". Links to the GitHub repo and docs. |
| `/lab`         | The animation lab: craft, mainly for peers. Kept as it is on `disc`.                                                        |
| `/community`   | The run club, the talks, TD Brackets as open source, the lab, and Instagram (§5.2).                                         |
| `/talks`       | The talks. Linked from `/community`, not in the nav.                                                                        |
| `/about`       | Harrison as founder; how the studio works. Links to the personal portfolio (`apps/portfolio`) for full work history.        |
| `/contact`     | Contact.                                                                                                                    |
| `/run`         | Kept, not in the nav. An event page linked from `/community` and shared directly.                                           |
| `/services`    | Removed. Redirects to `/`.                                                                                                  |

**Nav:** Platforms · TD Brackets · Lab · Community · About · Contact.

### 5.1 Front page

Its job is to route an agency team to one of the two offers. It is short.

1. **Portal Mark** as the visual, with one line that says what Bracket Bear
   does (both offers).
2. **Two doors**: Platforms and TD Brackets.
3. **The package**: one paragraph saying you can hire us for both, with the
   Hyperquake welcome wall as the example.
4. **A community strip**: the run club, the talks and the lab, linking to
   `/community`.
5. **Contact.**

No long scroll of character sections.

### 5.2 `/community`

The run club, the talks, TD Brackets as open source, the lab (which also
keeps its own page), and Instagram. Written as what Bracket Bear gives the
industry. It is not a sales page.

## 6. `/platforms`: the three platforms

Told on one page, in order. Each gets the company, Harrison's role, the
dates, one or two images and one sentence of outcome.

| Platform                       | Company                   | Role                                                       | When                                     |
| ------------------------------ | ------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| Bridge                         | Downstream (employee)     | Lead front-end engineer                                    | 2020–2022                                |
| Gumband                        | Deeplocal (employee)      | Full-stack software engineer                               | 2024–2025 (paused after company layoffs) |
| Hyperquake Experience Platform | Bracket Bear (consulting) | Architected the platform: CMS, machine agent, integrations | 2025– (Conflower began October 2025)     |

Rules:

- This is presented as **Harrison's track record**, under his name. The
  site never calls Downstream or Deeplocal Bracket Bear clients. Hyperquake is
  the first of the three that Bracket Bear built.
- **Bridge and Gumband images:** only images the companies themselves
  published. Candidates already on disk, provenance to confirm before use:
  `apps/portfolio/public/content-images/work/projects/{ds-bridge,dl-gumband}/`,
  `~/Downloads/deploy-650a299696c8366117797755/bridge_ui_{1,2,3}_*.{jpg,png}`
  (filenames suggest Downstream's public site), `~/Downloads/gumband-bizdev.webp`.
  If provenance can't be confirmed, ship that platform without images.
- **Hyperquake:** Harrison is publishing without asking Hyperquake first.
  To keep that low-risk:
  - Name Hyperquake and describe what we built. Stick to our role and the
    facts.
  - **Make no claims about Hyperquake's business** (revenue, new lines of
    business, results for them). The v2 line "Hyperquake is selling
    something they couldn't sell before" is dropped.
  - Screenshots only with no client or exhibit data visible.
  - Before launch, Harrison checks the consulting agreement for a
    confidentiality or portfolio-use clause.

**What `/platforms` sells** (settled 2026-11-23): a full platform, or one
piece of one inside an agency's existing setup (an agent for its exhibit
machines, a receiver for its runtime, or a CMS for its producers).

No separate case-study pages at launch. They can follow.

## 7. `/td-brackets`

- The framework: what it is, who it's for, how to start. Links to the repo
  and docs.
- **The apps built on it**, each as a short looping video with its repo link
  once that repo is public. Candidates: `hyperquake-welcome-wall`,
  `cyberpunk-wall`, `crystal-effect`, `3d-voxel-matrix`, `td-breakout`
  ("Brick Your Face Off"), `td-portal` (Portal Mark in TouchDesigner).
- The offer: we build TouchDesigner apps on it for you.

## 8. Design

One visual system across every page, built from the holding page and Portal
Mark. The v2 decision to keep `.bb-home` styling scoped to the homepage and
restyle other pages later is reversed: every page is rebuilt here, so the
restyle is part of the rebuild.

## 9. Copy process

Copy is drafted per page against §2–§7, in this order of tools:

1. `/bb-voice` (brand register) and the Voice Rules file set the voice.
2. `/copywriting` and `/ogilvy` for structure, headlines and the offer.
3. `/copy-editing` for focused editing passes.
4. `/stop-slop` as the last pass.

The brand docs win any conflict. A line that waits on a missing fact is
marked `[PLACEHOLDER]` in the copy file and tracked in the project notes; no
placeholder ships.

## 10. Launch requirements

The site and the TD Brackets open-source release launch together. The new
site does not ship until all of these are true:

- [ ] TD Brackets is public with an MIT license, a README that gets someone
      from install to a running app, and at least two showcase apps public
      as examples.
- [ ] The Hyperquake consulting agreement has been checked for a
      confidentiality or portfolio-use clause.
- [ ] Bridge and Gumband image provenance confirmed (or those platforms ship
      without images).
- [ ] Looping videos captured for the TD Brackets apps shown.
- [ ] `apps/cms/content/work/jobs/bb-freelance-developer.json` fixed: it
      says Bracket Bear ended 2023-12-12, and `/about` links to the
      portfolio that reads it.
- [ ] `/services` redirect in place.
- [ ] On launch, production moves from the hand-deployed `holding` branch to
      the new site, and `holding` is deleted (see `docs/deployment.md`;
      Netlify is not linked to the repo).

## 11. Open, for the copy and plan stages

1. ~~Which name the site uses for Hyperquake's platform.~~ Settled
   2026-11-22: "Hyperquake's Experience Platform", which Harrison architected.
2. Which two TD Brackets apps go public first as examples.
3. ~~The start date and founding year.~~ Settled 2026-11-23: Bracket Bear
   became official in 2025.
4. Bracket Bear's Instagram handle, or whether the account exists yet.

## 12. Next steps

1. Draft the copy per §9: front page, `/platforms`, `/td-brackets`, then
   `/about`, `/community` and `/contact`.
2. Write the implementation plan from this spec and the approved copy.
