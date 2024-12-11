import { Field, Bool, ZkProgram, SelfProof, Provable, PublicKey } from 'o1js';
import { GameInput, GameOutput, Tile } from './utils/types';
import { hashFieldsWithPoseidon } from './utils/helpers';

const emptyTiles = new Array(2).fill(new Tile({ id: Field(0) }));

// Define the TileGameProgram
export const TileGameProgram = ZkProgram({
  name: 'tile-game',
  publicInput: GameInput,
  publicOutput: GameOutput,

  methods: {
    // Initialize the game state for Player 1
    initGamePlayer1: {
      privateInputs: [Provable.Array(Tile, 4)],

      async method(publicInput: GameInput, playerTiles: Tile[]) {
        const BoardHash = hashFieldsWithPoseidon(
          playerTiles.map((tile) => tile.id)
        );

        // Perform the signature verification
        const isVerified = publicInput.signiture.verify(publicInput.PublicKey, [
          BoardHash,
        ]);
        // Enforce the signature verification result
        isVerified.assertTrue('Signature verification failed!');

        return {
          publicOutput: new GameOutput({
            Player1: publicInput.PublicKey,
            Player2: PublicKey.empty(),
            Board1Hash: BoardHash,
            Board2Hash: Field.empty(),
            turn: Field(2),
            move: emptyTiles,
            Player1MatchCount: Field(0),
            Player2MatchCount: Field(0),
          }),
        };
      },
    },

    // Initialize the game state for Player 2, using Player 1's proof
    initGamePlayer2: {
      privateInputs: [
        SelfProof<GameInput, GameOutput>,
        Provable.Array(Tile, 4),
      ],

      async method(
        publicInput: GameInput,
        earlierProof: SelfProof<GameInput, GameOutput>,
        playerTiles: Tile[]
      ) {
        const BoardHash = hashFieldsWithPoseidon(
          playerTiles.map((tile) => tile.id)
        );
        const isVerified = publicInput.signiture.verify(publicInput.PublicKey, [
          BoardHash,
        ]);
        // Enforce the signature verification result
        isVerified.assertTrue('Signature verification failed!');

        earlierProof.verify();
        // Assert that the turn is Field(2)
        earlierProof.publicOutput.turn
          .equals(Field(2))
          .assertTrue('Turn is not Field(2)');

        // Assert that Player1 is not empty
        earlierProof.publicOutput.Player1.equals(PublicKey.empty())
          .not()
          .assertTrue('Player1 is empty!');

        // Assert that Board1 is not empty
        earlierProof.publicOutput.Board1Hash.equals(Field.empty())
          .not()
          .assertTrue('Board1Hash is empty!');

        // Check if earlierProof.publicOutput.move is equal to emptyTiles
        for (let i = 0; i < earlierProof.publicOutput.move.length; i++) {
          earlierProof.publicOutput.move[i].id
            .equals(emptyTiles[i].id)
            .assertTrue('Move is not equal to emptyTiles!');
        }

        return {
          publicOutput: new GameOutput({
            Player1: earlierProof.publicOutput.Player1,
            Player2: publicInput.PublicKey,
            Board1Hash: earlierProof.publicOutput.Board1Hash,
            Board2Hash: BoardHash,
            turn: Field(1),
            move: emptyTiles,
            Player1MatchCount: Field(0),
            Player2MatchCount: Field(0),
          }),
        };
      },
    },

    // Method to play a turn in the game
    playTurn: {
      privateInputs: [
        SelfProof<GameInput, GameOutput>,
        Provable.Array(Tile, 4),
        Provable.Array(Tile, 2),
      ],
      async method(
        publicInput: GameInput,
        earlierProof: SelfProof<GameInput, GameOutput>,
        playerTiles: Tile[],
        selectedTiles: Tile[]
      ) {
        const BoardHash = hashFieldsWithPoseidon(
          playerTiles.map((tile) => tile.id)
        );
        const isVerified = publicInput.signiture.verify(publicInput.PublicKey, [
          BoardHash,
        ]);
        // Enforce the signature verification result
        isVerified.assertTrue('Signature verification failed!');

        earlierProof.verify();

        // Assert that Player1 is not empty
        earlierProof.publicOutput.Player1.equals(PublicKey.empty())
          .not()
          .assertTrue('Player1 is empty!');

        // Assert that Player2 is not empty
        earlierProof.publicOutput.Player2.equals(PublicKey.empty())
          .not()
          .assertTrue('Player2 is empty!');

        // If publicInput is equal to previousOutput.Player1, then turn is 1 else turn is 2

        const turn = Provable.switch(
          [
            earlierProof.publicOutput.Player1.equals(publicInput.PublicKey),
            earlierProof.publicOutput.Player2.equals(publicInput.PublicKey),
          ], // Conditions array
          Field, // Output type
          [Field(1), Field(2)] // Values corresponding to the conditions
        );

        //Assert true the turn is the same as previousOutput.turn
        turn
          .equals(earlierProof.publicOutput.turn)
          .assertTrue('Invalid Public Key or Turn');

        const newTurn = Provable.if(turn.equals(Field(1)), Field(2), Field(1));

        const isMoveEmpty = earlierProof.publicOutput.move[0].id
          .equals(Field(0))
          .and(earlierProof.publicOutput.move[1].id.equals(Field(0)));

        // Check if tiles in the move match
        const isTilesMatch = earlierProof.publicOutput.move[0].id.equals(
          earlierProof.publicOutput.move[1].id
        );

        // Calculate Player1MatchCount
        const Player1MatchCount = Provable.if(
          isMoveEmpty,
          earlierProof.publicOutput.Player1MatchCount, // Case 1: Move is empty, no change
          Provable.if(
            isTilesMatch.and(
              publicInput.PublicKey.equals(earlierProof.publicOutput.Player2)
            ),
            earlierProof.publicOutput.Player1MatchCount.add(1), // Case 2: Tiles match and move by Player2
            earlierProof.publicOutput.Player1MatchCount // Default: No change
          )
        );

        // Calculate Player2MatchCount
        const Player2MatchCount = Provable.if(
          isMoveEmpty,
          earlierProof.publicOutput.Player2MatchCount, // Case 1: Move is empty, no change
          Provable.if(
            isTilesMatch.and(
              publicInput.PublicKey.equals(earlierProof.publicOutput.Player1)
            ),
            earlierProof.publicOutput.Player2MatchCount.add(1), // Case 2: Tiles match and move by Player1
            earlierProof.publicOutput.Player2MatchCount // Default: No change
          )
        );

        return {
          publicOutput: new GameOutput({
            Player1: earlierProof.publicOutput.Player1,
            Player2: earlierProof.publicOutput.Player2,
            Board1Hash: earlierProof.publicOutput.Board1Hash,
            Board2Hash: earlierProof.publicOutput.Board2Hash,
            turn: newTurn,
            move: selectedTiles,
            Player1MatchCount,
            Player2MatchCount,
          }),
        };
      },
    },
  },
});
