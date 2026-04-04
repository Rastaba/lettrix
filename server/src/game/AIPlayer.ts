import { Game } from './Game';
import { findBestMove, AIDifficulty } from './AI';

export { AIDifficulty } from './AI';

const AI_NAMES: Record<AIDifficulty, string[]> = {
  easy: ['Rookie', 'Newbie', 'ChillBot'],
  medium: ['Lexia', 'WordBot', 'Stratège'],
  hard: ['Mastermind', 'Overlord', 'Lexicon'],
};

export function getAIName(difficulty: AIDifficulty): string {
  const names = AI_NAMES[difficulty];
  return '🤖 ' + names[Math.floor(Math.random() * names.length)];
}

export function scheduleAIMove(
  game: Game,
  aiPlayerId: string,
  difficulty: AIDifficulty,
  onDone: () => void,
): void {
  const delay = 1500 + Math.random() * 1500; // 1.5-3s
  setTimeout(() => {
    if (game.status !== 'playing') return;
    if (game.players[game.currentPlayerIndex]?.id !== aiPlayerId) return;

    const aiPlayer = game.players.find(p => p.id === aiPlayerId);
    if (!aiPlayer) return;

    const isFirstMove = game.moveHistory.filter(m => m.type === 'play').length === 0;
    const move = findBestMove(game.board, aiPlayer.rack, isFirstMove, game.lang, difficulty);

    if (move) {
      game.playMove(aiPlayerId, move.placements);
    } else if (game.tileBag.remaining() >= 1 && aiPlayer.rack.length > 0) {
      // Exchange 1-3 tiles if no move found
      const count = Math.min(3, aiPlayer.rack.length, game.tileBag.remaining());
      const tileIds = aiPlayer.rack.slice(0, count).map(t => t.id);
      game.exchangeTiles(aiPlayerId, tileIds);
    } else {
      game.passTurn(aiPlayerId);
    }

    onDone();
  }, delay);
}
