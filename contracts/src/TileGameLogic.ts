import { verify, Field, SelfProof, PublicKey } from 'o1js';
import {
  TileGameProgram,
  PublicInput,
  GameOutput,
  Tile,
} from './TileGameProgram';

export class TileGameLogic {
  // Method for User 1 to initialize the game
  static async initializeGameForUser1(verificationKey: string) {
    // Public input for User 1
    const publicInput = new PublicInput({
      currentStep: Field(1),
      selectedTiles: new Array(2).fill(
        new Tile({ id: Field(0), urlHash: Field(0) })
      ),
    });

    // Generate proof and output using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGamePlayer1(
      publicInput
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
    earlierProof: SelfProof<PublicInput, GameOutput>,
    verificationKey: string,
    currentStep: Field
  ) {
    // Public input for User 2
    const publicInput = new PublicInput({
      currentStep: currentStep,
      selectedTiles: new Array(2).fill(
        new Tile({ id: Field(0), urlHash: Field(0) })
      ),
    });

    // Generate proof and output using the ZkProgram
    const { proof: initGameProof } = await TileGameProgram.initGamePlayer2(
      publicInput,
      earlierProof
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
    earlierProof: SelfProof<PublicInput, GameOutput>,
    verificationKey: string,
    allTheTiles: Tile[],
    selectedTiles: Tile[],
    previouslyMatchedTiles: Field[],
    currentStep: Field
  ) {
    // Public input for User 2
    const publicInput = new PublicInput({
      currentStep: currentStep,
      selectedTiles: selectedTiles,
    });

    // Generate proof and output using the ZkProgram
    const { proof: playTurn } = await TileGameProgram.playTurn(
      publicInput,
      allTheTiles,
      previouslyMatchedTiles,
      earlierProof
    );

    // Verify the proof
    const isValid = await verify(playTurn.toJSON(), verificationKey);

    console.log('Verified proof', playTurn.toJSON());

    if (!isValid) {
      throw new Error('Tile game initialization for User 2 failed!');
    }
    console.log('User 2 initialized the game successfully!');
    return playTurn;
  }
}
