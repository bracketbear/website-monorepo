# LinkedIn post corpus

Harrison Callahan's LinkedIn posts, scraped 2026-08-05 from the profile activity
feed (Posts filter). This is the raw source material for the voice/writing-style
analysis, which **has been done**: see [`../VOICE.md`](../VOICE.md) for the
resulting voice profile and [`../calibration/`](../calibration/) for the two
blind calibration rounds that tested it. Ten of the posts here are held out of
VOICE.md's analysis and citations as a calibration set
([`../calibration/holdout.json`](../calibration/holdout.json)), so VOICE.md is
derived from 192 of the 202 files in `posts/`.

## Contents

- `posts/` — 202 original posts (Harrison's own words). One markdown file per
  post, named `YYYY-MM-DD--<slug>.md`, sorted naturally by date.
- `reposts/` — 8 reposts of _other people's_ content. **The body text in these
  is not Harrison's writing** — keep them out of any voice analysis. They're
  retained only as a signal of what he chooses to amplify.
- `INDEX.md` — table of every item (date, type, word count, opening line, link).
- `raw.json` — the unprocessed scrape output, one object per post.

## File format

Each post file has YAML frontmatter:

```yaml
date: 2025-12-09 # exact date, decoded from the activity URN timestamp
type: original # original | repost
author: Harrison Callahan
edited: true # LinkedIn showed an "Edited" marker
words: 312
urn: urn:li:activity:7407124330314108929
url: https://www.linkedin.com/feed/update/urn:li:activity:.../
```

Body is the full post text as rendered by LinkedIn, with two normalizations:
`hashtag\n#foo` DOM artifacts collapsed to `#foo`, and leading/trailing
whitespace trimmed. Emoji, line breaks, and punctuation are preserved exactly —
these matter for voice analysis.

## Caveats

- Dates are derived from the LinkedIn activity ID (first 41 bits = ms epoch),
  so they're exact even though the UI only showed "3mo"-style labels. Dates are
  UTC.
- Covers 2017-07-17 through 2026-08-05; 210 items total. The feed was scrolled
  until LinkedIn stopped loading more (~210 posts), so the earliest years may be
  incomplete.
- Media-only posts (image/video/link shares with no commentary) have a
  placeholder body but are kept for completeness.
- Short link-share commentary ("Can't wait!", "👇🤯") is included — brevity and
  reaction style are part of voice.
- Comments on other people's posts and LinkedIn articles are **not** included;
  only feed posts.
