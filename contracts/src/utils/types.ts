import { Field, Mina, PublicKey, Provable, Struct, Signature } from 'o1js';

export interface GameContract {
  deploy: () => Promise<void>;
  initGame: (
    player1: Mina.TestPublicKey,
    player2: Mina.TestPublicKey
  ) => Promise<void>;
  distributeReward: (player: PublicKey) => Promise<void>;
}

// Define a Tile as a struct
export class Tile extends Struct({
  id: Field,
}) {}
// Define the PublicInput structure
export class GameInput extends Struct({
  signiture: Signature,
  PublicKey: PublicKey,
}) {}

// Define the Output structure
export class GameOutput extends Struct({
  Player1: PublicKey,
  Player2: PublicKey,
  Board1Hash: Field,
  Board2Hash: Field,
  turn: Field,
  move: Provable.Array(Tile, 2),
  Player1MatchCount: Field,
  Player2MatchCount: Field,
}) {}

// Define PlayerTiles as a struct
export class PlayerTiles extends Struct({
  tiles: [Tile],
}) {}
