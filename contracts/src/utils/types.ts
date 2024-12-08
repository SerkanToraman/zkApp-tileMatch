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
  id: Field, // A hash of the URL for privacy
}) {}
// Define the PublicInput structure
export class GameInput extends Struct({
  signiture: Signature,
  PublicKey: PublicKey,
}) {}

// Define the Output structure
export class GameOutput extends Struct({
  nextStep: Field, // Current step of the game
  matchedTiles: Provable.Array(Field, 2), // Array to store matched tiles
}) {}

// Define PlayerTiles as a struct
export class PlayerTiles extends Struct({
  tiles: [Tile], // An array of Tile structs
}) {}
