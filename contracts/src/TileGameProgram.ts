import { Field, ZkProgram, PublicKey, Struct, Provable, Poseidon } from 'o1js';

// Define a Tile as a struct
export class Tile extends Struct({
  id: Field, // Representing a unique tile identifier
  urlHash: Field, // A hash of the URL for privacy
}) {}

// Define PlayerTiles as a struct
export class PlayerTiles extends Struct({
  tiles: [Tile], // An array of Tile structs
}) {}

export const PlayerTilesZK = Provable.Array(Tile, 4);

// Define PublicInput as a struct
export class PublicInput extends Struct({
  player1TilesHash: Field,
  player2TilesHash: Field,
}) {}

// Define TileGameProgram
export const TileGameProgram = ZkProgram({
  name: 'tile-game',
  publicInput: PublicInput, // Struct containing hashes for validation

  methods: {
    initGame: {
      privateInputs: [PublicKey, PublicKey, PlayerTilesZK, PlayerTilesZK],

      async method(
        publicInput: PublicInput,
        player1: PublicKey,
        player2: PublicKey,
        tilesForPlayer1: Tile[],
        tilesForPlayer2: Tile[]
      ) {
        // Validate player1 and player2 public keys
        player1
          .isEmpty()
          .not()
          .assertTrue('Player 1 Public Key must not be empty');
        player2
          .isEmpty()
          .not()
          .assertTrue('Player 2 Public Key must not be empty');
          
        // Calculate hashes for the received tiles
        const calculatedPlayer1Hash = Poseidon.hash(
          tilesForPlayer1.map((tile) => tile.urlHash)
        );

        const calculatedPlayer2Hash = Poseidon.hash(
          tilesForPlayer2.map((tile) => tile.urlHash)
        );
        // Assert that the hashes match the public input
        publicInput.player1TilesHash.assertEquals(
          calculatedPlayer1Hash,
          'Player 1 tiles hash mismatch'
        );
        publicInput.player2TilesHash.assertEquals(
          calculatedPlayer2Hash,
          'Player 2 tiles hash mismatch'
        );
        console.log('Tile hashes validated successfully.');
      },
    },
  },
});
