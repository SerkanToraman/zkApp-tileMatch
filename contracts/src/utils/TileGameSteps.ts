import { verify, Field, Mina, SelfProof, PublicKey, Signature } from 'o1js';
import { TileGameProgram } from '../TileGameProgram';
import { GameInput, GameOutput, Tile } from './types';
import { FieldType } from 'o1js/dist/node/lib/provable/core/fieldvar';

export class TileGameLogic {
  // Method for User 1 to initialize the game
  static async initializeGameForUser1(
    verificationKey: string,
    player1Account: PublicKey,
    player1Signature: Signature,
    player1Board: Tile[]
  ) {
    // Public input for User 1
    const publicInput = new GameInput({
      signiture: player1Signature,
    });

    // Generate proof and output using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGamePlayer1(
      publicInput,
      player1Account,
      player1Board
    );

    // Verify the proof
    const isValid = await verify(initGameProof.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('Tile game initialization for User 1 failed!');
    }

    return initGameProof;
  }

  // Method for User 2 to initialize the game using User 1's proof
  static async initializeGameForUser2(
    earlierProof: SelfProof<GameInput, GameOutput>,
    verificationKey: string,
    player2Account: PublicKey,
    player2Signature: Signature,
    player1Board: Tile[]
  ) {
    // Public input for User 2
    const publicInput = new GameInput({
      signiture: player2Signature,
    });

    // Generate proof and output using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGamePlayer2(
      publicInput,
      earlierProof,
      player2Account,
      player1Board
    );

    // Verify the proof
    const isValid = await verify(initGameProof.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('Tile game initialization for User 2 failed!');
    }

    console.log('User 2 initialized the game successfully!');
    return initGameProof;
  }

  // Method for User to playTurn
  static async playTurn(
    earlierProof: SelfProof<GameInput, GameOutput>,
    verificationKey: string,
    playerSignature: Signature,
    playerTiles: Tile[],
    selectedTiles: Field[]
  ) {
    // Public input for User
    const publicInput = new GameInput({
      signiture: playerSignature,
    });

    // Generate proof and output using the ZkProgram
    const { proof: playTurn } = await TileGameProgram.playTurn(
      publicInput,
      earlierProof,
      playerTiles,
      selectedTiles
    );

    // Verify the proof
    const isValid = await verify(playTurn.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('Tile game initialization for User 2 failed!');
    }
    return playTurn;
  }
}
