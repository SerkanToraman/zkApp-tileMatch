import { Field, PublicKey, verify, Provable } from 'o1js';
import { DetermineWinner, PlayerScores } from './DetermineWinner';

export class WinnerProgram {
  static async determineWinnerWithZkProgram(
    scores: PlayerScores,
    player1: PublicKey,
    player2: PublicKey,
    verificationKey: string
  ): Promise<PublicKey> {
    console.log('Running DetermineWinner ZkProgram...');

    // Calculate the winner locally
    const isPlayer1Winner = scores.player1Score.greaterThan(
      scores.player2Score
    );
    const calculatedWinner = Provable.if(isPlayer1Winner, player1, player2);

    // Generate a proof using the ZkProgram
    const { proof } = await DetermineWinner.calculateWinner(
      calculatedWinner, // Pass the public input (winner's public key)
      scores,
      player1,
      player2
    );

    console.log('Proof generated. Verifying...');
    const isValid = await verify(proof.toJSON(), verificationKey);

    if (!isValid) {
      throw new Error('ZkProgram verification failed!');
    }

    console.log('ZkProgram verification succeeded!');
    console.log('Winner Address:', proof.publicInput.toBase58());

    return proof.publicInput; // Return the winner's PublicKey
  }
}
