# Zenzeii — Identity & Design Philosophy

## What Zenzeii is

Zenzeii is a Japanese literary reading application. Users read authentic Japanese and classic English literature with integrated translation, furigana, dictionary lookup, vocabulary saving, and reading progress tracking.

The name and the app are built around a specific experience: **slow, meditative engagement with great literature**. This is not a flashcard app. This is not a gamified learning platform. It is a reading app for people who want to sit with a book in Japanese.

## Founder

**Nico** (nicogarciia1) is the founder and sole non-technical stakeholder. He has a clear vision for the product but does not write code. All technical decisions are made by Claude sessions in collaboration with Nico. When communicating with Nico, use plain language — no jargon, no acronyms without explanation.

## Design philosophy — what this means in practice

**Literary / classical**: UI should feel like a reading environment. Calm. Spacious. Typography-first. Serif fonts, ink-and-paper palette are appropriate. Neon, badges, level-up animations, streaks-as-gamification are not.

**Not gamified**: Streak counts exist as *information*, not as *motivators*. Do not add achievement badges, XP bars, daily challenges, or anything that makes reading feel like a game.

**Meditative, not anxious**: The experience of using Zenzeii should feel unhurried. No intrusive notifications, no aggressive upsell prompts, no countdown timers.

**Authentic literature**: The library focuses on genuine literary texts — Project Gutenberg classics (English), Aozora Bunko (Japanese). The quality of source material matters.

## Current phase

**Restructuring and clarity** — not new features.

The codebase is functional and deployed. The current priority is understanding what exists, cleaning up structural debt (e.g., `server.py` is 2,100+ lines and should be split), and establishing reliable documentation before adding anything new.

If Nico asks for a new feature, a Claude session should first ask: *does this fit the phase?* If it's a genuinely small addition with no architectural risk, proceed. If it requires significant new infrastructure or risks destabilising what works, flag it and defer to COO.

## What not to build (without explicit discussion)

- Gamification mechanics (XP, achievements, leaderboards, daily streaks as goals)
- Social features (sharing, following, public profiles)
- Subscription/monetisation infrastructure
- Mobile-native app (web is the current target)
- AI conversation features beyond the existing ZenzeiiChat component
