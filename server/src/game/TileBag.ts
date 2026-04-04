import { Tile } from '../types';
import { GameLang, getLetterValues, getTileDistribution } from './constants';

let nextTileId = 1;
function genId(): string {
  return 't' + nextTileId++;
}

export class TileBag {
  private tiles: Tile[] = [];

  constructor(lang: GameLang = 'en') {
    const dist = getTileDistribution(lang);
    const values = getLetterValues(lang);

    for (const [letter, count] of Object.entries(dist)) {
      for (let i = 0; i < count; i++) {
        if (letter === '?') {
          this.tiles.push({ id: genId(), letter: '', value: 0, isBlank: true });
        } else {
          this.tiles.push({
            id: genId(),
            letter,
            value: values[letter],
            isBlank: false,
          });
        }
      }
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  draw(): Tile | null {
    return this.tiles.pop() ?? null;
  }

  returnTile(tile: Tile): void {
    if (tile.isBlank) tile.letter = '';
    this.tiles.push(tile);
    this.shuffle();
  }

  remaining(): number {
    return this.tiles.length;
  }
}
