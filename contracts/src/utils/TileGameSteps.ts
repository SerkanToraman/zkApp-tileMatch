import { verify, Field, SelfProof, PublicKey, Signature } from 'o1js';
import { TileGameProgram } from '../TileGameProgram';
import { GameInput, Tile } from './types';

export class TileGameLogic {
  // Method for User 1 to initialize the game
  static async initializeGameForUser1(
    verificationKey: string,
    player1Account: PublicKey,
    player1Signature: Signature,
    player1Tiles: Tile[]
  ) {
    // Public input for User 1
    const publicInput = new GameInput({
      signiture: player1Signature,
      PublicKey: player1Account,
    });

    // Generate proof and output using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGamePlayer1(
      publicInput,
      player1Tiles
    );

    // Verify the proof
    const isValid = await verify(initGameProof.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('Tile game initialization for User 1 failed!');
    }

    return initGameProof;
  }

  // Method for User 2 to initialize the game using User 1's proof
  // static async initializeGameForUser2(
  //   earlierProof: SelfProof<GameInput, GameOutput>,
  //   verificationKey: string
  // ) {
  //   // Public input for User 2
  //   const publicInput = new GameInput({
  //     selectedTiles: new Array(2).fill(new Tile({ id: Field(0) })),
  //   });

  //   // Generate proof and output using the ZkProgram
  //   const { proof: initGameProof } = await TileGameProgram.initGamePlayer2(
  //     publicInput,
  //     earlierProof
  //   );

  //   // Verify the proof
  //   const isValid = await verify(initGameProof.toJSON(), verificationKey);

  //   if (!isValid) {
  //     throw new Error('Tile game initialization for User 2 failed!');
  //   }

  //   console.log('User 2 initialized the game successfully!');
  //   return initGameProof;
  // }

  // // Method for User to playTurn
  // static async playTurn(
  //   earlierProof: SelfProof<GameInput, GameOutput>,
  //   verificationKey: string,
  //   allTheTiles: Tile[],
  //   selectedTiles: Tile[],
  //   previouslyMatchedTiles: Field[]
  // ) {
  //   // Public input for User 2
  //   const publicInput = new GameInput({
  //     selectedTiles: selectedTiles,
  //   });

  //   // Generate proof and output using the ZkProgram
  //   const { proof: playTurn } = await TileGameProgram.playTurn(
  //     publicInput,
  //     allTheTiles,
  //     previouslyMatchedTiles,
  //     earlierProof
  //   );

  //   // Verify the proof
  //   const isValid = await verify(playTurn.toJSON(), verificationKey);

  //   console.log('Verified proof', playTurn.toJSON());

  //   if (!isValid) {
  //     throw new Error('Tile game initialization for User 2 failed!');
  //   }
  //   console.log('User 2 initialized the game successfully!');
  //   return playTurn;
  // }
}
