import { PublicKey, verify, Field, Poseidon } from 'o1js';
import { TileGameProgram, PlayerTiles, PublicInput } from './TileGameProgram';

export class TileGameLogic {
  static async initializeGame(
    player1: PublicKey,
    player2: PublicKey,
    tilesForPlayer1: PlayerTiles,
    tilesForPlayer2: PlayerTiles,
    verificationKey: string
  ) {
    console.log('Initializing tile game...');

    // Calculate hashes for tiles
    const player1TilesHash = Poseidon.hash(
      tilesForPlayer1.tiles.map((tile) => tile.urlHash)
    );
    const player2TilesHash = Poseidon.hash(
      tilesForPlayer2.tiles.map((tile) => tile.urlHash)
    );

    // Generate proof using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGame(
      new PublicInput({
        player1TilesHash,
        player2TilesHash,
      }),
      player1,
      player2,
      tilesForPlayer1.tiles,
      tilesForPlayer2.tiles
    );

    console.log('Proof generated. Verifying...');

    // Verify the proof
    const isValid = await verify(initGameProof.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('Tile game initialization verification failed!');
    }

    console.log('Tile game initialized successfully!');
    return initGameProof;
  }
}
