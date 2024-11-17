import { Field, PublicKey, Struct, Bool } from 'o1js';
import { GameContract } from './GameContract';

export class PlayerScores extends Struct({
  player1Score: Field,
  player2Score: Field,
}) {}

export class WinnerProgram {
  static determineWinner(
    scores: PlayerScores,
    gameContract: GameContract
  ): PublicKey {
    const player1 = gameContract.player1.get();
    const player2 = gameContract.player2.get();

    console.log('Player1 Address:', player1.toBase58());
    console.log('Player2 Address:', player2.toBase58());
    console.log('Scores:');
    console.log('Player1 Score:', scores.player1Score.toString());
    console.log('Player2 Score:', scores.player2Score.toString());

    const winner = scores.player1Score
      .greaterThan(scores.player2Score)
      .toBoolean()
      ? player1
      : player2;

    console.log('Winner Address:', winner.toBase58());

    console.log('Winner Address:', winner.toBase58());
    return winner;
  }
}
