# Lettrix

**Free, open-source multiplayer word game.** Play online with friends or against AI — no signup required.

**[Play Now](https://lettrix.fly.dev)**

---

## Features

**Gameplay**
- 15x15 board with bonus squares (word x2/x3, letter x2/x3)
- French (402K words) and English (359K words) dictionaries
- Real-time score preview before you play
- Drag & drop or click to place tiles
- Blank tiles (wildcards) with letter selection
- +50 bonus for using all 7 tiles in one move (LETTRIX!)

**Multiplayer**
- Play against friends with a 4-letter room code
- Matchmaking — find a random opponent in 1 click
- Real-time sync via WebSocket
- Auto-reconnection (survives page refresh)
- Rematch in 1 click after a game

**Solo vs AI**
- 3 difficulty levels: Easy, Medium, Hard
- The AI uses the real dictionary — no cheating, no API, runs locally
- Perfect for practice or completing daily missions

**Engagement**
- Daily streak (play every day to keep your fire going)
- 3 daily missions with XP rewards
- 41 achievements across 4 rarity tiers
- XP + levels with titles (Beginner to Immortal)
- 9 unlockable themes (Neon, Classic, Ocean, Sakura, Hacker, Gold, Midnight, Retro, Aurora)

**Social**
- Head-to-head rivalry history (track your record vs each opponent)
- In-game emoji reactions (like Clash Royale)
- Game replay with animated Canvas playback
- GIF export of replays
- Share results on X/Twitter and WhatsApp

**Polish**
- 9 visual themes with full reskinning
- Procedural sound effects (Web Audio API, zero audio files)
- Score celebrations with particles and confetti (Canvas-rendered)
- Bilingual FR/EN (interface + tiles + dictionary)
- Responsive: desktop, tablet, mobile
- Accessible: aria-labels, keyboard shortcuts, reduced motion support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js, Express, Socket.io, TypeScript |
| Client | React 18, Vite, Tailwind CSS, TypeScript |
| Drag & Drop | @dnd-kit |
| Real-time | Socket.io (WebSocket) |
| Audio | Web Audio API (synthesis) |
| AI | Custom engine, no external API |
| Deploy | Docker, Fly.io |

## Quick Start

```bash
# Install
npm install && npm run install:all

# Download dictionaries (FR + EN)
npm run setup-dict

# Run (dev)
npm run dev
# Open http://localhost:5180
```

## Production

```bash
npm run build
npm start
# Serves on http://localhost:3001
```

Or with Docker:

```bash
docker build -t lettrix .
docker run -p 3001:3001 lettrix
```

## How to Play

1. Enter your name
2. **Find Match** (random opponent), **Play vs AI**, or **Create Game** (share code with a friend)
3. Place tiles on the board to form words
4. Score points — bonus squares multiply your score
5. Use all 7 tiles = LETTRIX! (+50 bonus points)

## Project Structure

```
lettrix/
├── server/src/          # Express + Socket.io + game engine
│   ├── game/            # Game logic, validation, AI, tile bag
│   ├── rooms/           # Room management + matchmaking
│   ├── db.ts            # JSON persistence + stats + missions
│   └── index.ts         # Socket event handlers
├── client/src/          # React + TypeScript
│   ├── components/      # UI components (Board, Rack, Controls, etc.)
│   ├── hooks/           # Game state, history, profile
│   ├── contexts/        # Theme + language providers
│   └── utils/           # GIF encoder
└── scripts/             # Dictionary download
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Disclaimer

Lettrix is an independent, open-source word game. It is not affiliated with, endorsed by, or licensed by Hasbro, Inc., Mattel, Inc., or any official trademark holder.

## License

MIT
