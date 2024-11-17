import { Field, ZkProgram, PublicKey, Struct, Provable } from 'o1js';

export class PlayerScores extends Struct({
  player1Score: Field,
  player2Score: Field,
}) {}

export const DetermineWinner = ZkProgram({
  name: 'determine-winner',
  publicInput: PublicKey, // The winner's public key is the output

  methods: {
    calculateWinner: {
      privateInputs: [PlayerScores, PublicKey, PublicKey],

      async method(
        publicInput: PublicKey,
        scores: PlayerScores,
        player1: PublicKey,
        player2: PublicKey
      ) {
        const isPlayer1Winner = scores.player1Score.greaterThan(
          scores.player2Score
        );

        // Use Provable.if to select the winner
        const winner = Provable.if(isPlayer1Winner, player1, player2);

        // Assert the winner matches the expected public input
        winner.assertEquals(publicInput);
      },
    },
  },
});
