# Contributing to Lettrix

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install && npm run install:all`
4. Download dictionaries: `npm run setup-dict`
5. Start dev server: `npm run dev`
6. Open `http://localhost:5180`

## Project Structure

- `server/` - Node.js + Express + Socket.io backend
- `client/` - React + Vite + Tailwind frontend
- `scripts/` - Utility scripts (dictionary download)

See `FEATURES.md` for a complete list of implemented features.

## How to Contribute

### Bug Reports
- Open an issue with steps to reproduce
- Include browser/OS info
- Screenshots help!

### Feature Requests
- Open an issue describing the feature
- Explain the use case

### Pull Requests
1. Create a branch from `main`
2. Make your changes
3. Ensure TypeScript compiles: `cd server && npx tsc --noEmit && cd ../client && npx tsc --noEmit`
4. Test manually with 2 browser windows
5. Submit PR with a clear description

## Code Guidelines

- TypeScript everywhere (no `any` unless absolutely necessary)
- Translations: add both FR and EN keys in `client/src/i18n.ts`
- Game rules: validation happens server-side only
- UI: use Tailwind classes, follow existing patterns
- Sounds: Web Audio API synthesis, no audio files

## Achievement System

Achievement definitions live in `server/src/achievements.ts`. The client fetches them via the `get-profile` socket event. If you add a new achievement:

1. Add the definition in `server/src/achievements.ts` (ACHIEVEMENTS array)
2. Add the check logic in `checkAchievements()` function
3. The client panel in `AchievementsPanel.tsx` has a local copy - update it too (this will be automated later)

## License

MIT - see LICENSE file.
