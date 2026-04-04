/**
 * Seed a test game into db.json for replay testing.
 * Does NOT affect player stats or leaderboard.
 *
 * Usage: node scripts/seed-test-game.js
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'server', 'data', 'db.json');

// Letter values (French)
const VALS = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,N:1,
  O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10
};

function tile(letter, row, col, isBlank = false) {
  return {
    row, col, letter: letter.toUpperCase(),
    value: isBlank ? 0 : (VALS[letter.toUpperCase()] ?? 0),
    isBlank
  };
}

// Build a realistic 12-move game with valid placements
const moveHistory = [
  // Move 1: JOUER (horizontal, crosses center)
  {
    playerName: 'BABA', type: 'play',
    words: ['JOUER'], score: 24, isFullRack: false,
    placements: [
      tile('J', 7, 5), tile('O', 7, 6), tile('U', 7, 7),
      tile('E', 7, 8), tile('R', 7, 9),
    ],
  },
  // Move 2: MOTS (vertical, hooks on O of JOUER)
  {
    playerName: 'TestBot', type: 'play',
    words: ['MOTS'], score: 12, isFullRack: false,
    placements: [
      tile('M', 5, 6), tile('T', 8, 6), tile('S', 9, 6),
    ],
  },
  // Move 3: TABLE (horizontal, hooks on T)
  {
    playerName: 'BABA', type: 'play',
    words: ['TABLE'], score: 18, isFullRack: false,
    placements: [
      tile('A', 8, 7), tile('B', 8, 8), tile('L', 8, 9), tile('E', 8, 10),
    ],
  },
  // Move 4: VENT (vertical from V on row 4)
  {
    playerName: 'TestBot', type: 'play',
    words: ['VENT'], score: 14, isFullRack: false,
    placements: [
      tile('V', 4, 9), tile('E', 5, 9), tile('N', 6, 9),
    ],
  },
  // Move 5: PRIX (horizontal)
  {
    playerName: 'BABA', type: 'play',
    words: ['PRIX'], score: 42, isFullRack: false,
    placements: [
      tile('P', 9, 3), tile('R', 9, 4), tile('I', 9, 5), tile('X', 9, 7),
    ],
  },
  // Move 6: Bob exchanges
  {
    playerName: 'TestBot', type: 'exchange',
    words: [], score: 0,
  },
  // Move 7: DAME (horizontal)
  {
    playerName: 'BABA', type: 'play',
    words: ['DAME'], score: 16, isFullRack: false,
    placements: [
      tile('D', 6, 5), tile('A', 6, 6), tile('M', 6, 7), tile('E', 6, 8),
    ],
  },
  // Move 8: LUNE (horizontal, row 10)
  {
    playerName: 'TestBot', type: 'play',
    words: ['LUNE'], score: 8, isFullRack: false,
    placements: [
      tile('L', 10, 5), tile('U', 10, 6), tile('N', 10, 7), tile('E', 10, 8),
    ],
  },
  // Move 9: FEUILLE (7 letters! vertical from F row 3 col 8)
  {
    playerName: 'BABA', type: 'play',
    words: ['FEUILLE'], score: 76, isFullRack: true,
    placements: [
      tile('F', 3, 8), tile('I', 4, 8),
      tile('L', 5, 8), tile('L', 6, 8, false),
      tile('E', 10, 8, false),
    ],
  },
  // Move 10: GARE (horizontal, row 11)
  {
    playerName: 'TestBot', type: 'play',
    words: ['GARE'], score: 10, isFullRack: false,
    placements: [
      tile('G', 11, 5), tile('A', 11, 6), tile('R', 11, 7), tile('E', 11, 8),
    ],
  },
  // Move 11: ZERO (horizontal, row 12)
  {
    playerName: 'BABA', type: 'play',
    words: ['ZERO'], score: 26, isFullRack: false,
    placements: [
      tile('Z', 12, 6), tile('E', 12, 7), tile('R', 12, 8), tile('O', 12, 9),
    ],
  },
  // Move 12: CAFE (horizontal, row 3)
  {
    playerName: 'TestBot', type: 'play',
    words: ['CAFE'], score: 18, isFullRack: false,
    placements: [
      tile('C', 3, 5), tile('A', 3, 6), tile('F', 3, 7),
    ],
  },
  // Move 13: Alice passes
  {
    playerName: 'BABA', type: 'pass',
    words: [], score: 0,
  },
  // Move 14: HIVER (vertical)
  {
    playerName: 'TestBot', type: 'play',
    words: ['HIVER'], score: 22, isFullRack: false,
    placements: [
      tile('H', 3, 10), tile('I', 4, 10), tile('V', 5, 10),
      tile('E', 6, 10), tile('R', 7, 10),
    ],
  },
];

// Calculate final scores
let aliceScore = 0, bobScore = 0;
for (const m of moveHistory) {
  if (m.type !== 'play') continue;
  if (m.playerName === 'BABA') aliceScore += m.score;
  else bobScore += m.score;
}

const gameRecord = {
  id: 'TEST-REPLAY',
  date: new Date().toISOString(),
  language: 'fr',
  players: [
    { name: 'BABA', score: aliceScore },
    { name: 'TestBot', score: bobScore },
  ],
  winnerName: aliceScore > bobScore ? 'BABA' : bobScore > aliceScore ? 'TestBot' : null,
  moveCount: moveHistory.filter(m => m.type === 'play').length,
  bestWord: 'FEUILLE',
  bestWordScore: 76,
  moveHistory,
};

// Load DB and insert test game
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

// Remove any previous test game
db.games = db.games.filter(g => g.id !== 'TEST-REPLAY');

// Add at the beginning
db.games.unshift(gameRecord);

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

console.log(`✅ Test game inserted: ${gameRecord.id}`);
console.log(`   Alice: ${aliceScore} pts | Bob: ${bobScore} pts | Winner: ${gameRecord.winnerName}`);
console.log(`   ${moveHistory.length} moves (${gameRecord.moveCount} plays, 1 exchange, 1 pass)`);
console.log(`   Best move: FEUILLE +76 (full rack!)`);
console.log(`\n   Open the dashboard, go to game history, and click "Watch replay" on this game.`);
