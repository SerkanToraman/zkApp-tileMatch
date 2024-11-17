import { Field, ZkProgram, PublicKey, Struct, Bool, verify } from 'o1js';



export class PlayerScores extends Struct({
  player1Score: Field,
  player2Score: Field,
}) {}

export const DetermineWinner = ZkProgram({
  name: 'determine-winner',
  publicInput: PublicKey, // The winner's public key is the output

  methods: {
    init: {
      privateInputs: [PlayerScores, PublicKey, PublicKey],

      async method(
        initialWinner: PublicKey,
        scores: PlayerScores,
        player1: PublicKey,
        player2: PublicKey
      ) {
        const isPlayer1Winner = scores.player1Score.greaterThan(
          scores.player2Score
        );
        const winner = isPlayer1Winner.toBoolean() ? player1 : player2;

        // Assert the winner matches the expected public input
        initialWinner.assertEquals(winner);
      },
    },
  },
});
