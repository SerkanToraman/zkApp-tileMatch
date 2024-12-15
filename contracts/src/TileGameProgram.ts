import { Field, ZkProgram, SelfProof, Provable, PublicKey } from 'o1js';
import { GameInput, GameOutput, Tile } from './utils/types';
import { hashFieldsWithPoseidon } from './utils/helpers';

const emptyTiles = new Array(2).fill(Field(-1));
const emptyPreviousMoves = new Array(4).fill(Field(-1));
const boardArraySize = 4;
//TODO: Add Board Size as constant -->Done
//TODO : Player 1 and Player 2 public keys shpuld be asserted by turn value and remove player 1 and player 2 public key from the public input -->Done
//TODO : Send the indices of the moves instead of the urls. Assert the indices to be different -->Done
//TODO : Return the indices of the moves. Name it as previous move -->Done
//TODO: The matched tiles should not be send as selected tiles -->Done

// Define the TileGameProgram
export const TileGameProgram = ZkProgram({
  name: 'tile-game',
  publicInput: GameInput,
  publicOutput: GameOutput,

  methods: {
    // Initialize the game state for Player 1
    initGamePlayer1: {
      privateInputs: [PublicKey, Provable.Array(Tile, boardArraySize)],

      async method(
        publicInput: GameInput,
        Player1PublicKey: PublicKey,
        player1Board: Tile[]
      ) {
        const BoardHash = hashFieldsWithPoseidon(
          player1Board.map((tile) => tile.id)
        );

        // Perform the signature verification
        const isVerified = publicInput.signiture.verify(Player1PublicKey, [
          BoardHash,
        ]);
        // Enforce the signature verification result
        isVerified.assertTrue('Signature verification failed!');

        return {
          publicOutput: new GameOutput({
            Player1: Player1PublicKey,
            Player2: PublicKey.empty(),
            Board1Hash: BoardHash,
            Board2Hash: Field.empty(),
            turn: Field(2),
            move: emptyTiles,
            Player1MatchCount: Field(0),
            Player2MatchCount: Field(0),
            Player1PreviousMoves: emptyPreviousMoves,
            Player2PreviousMoves: emptyPreviousMoves,
          }),
        };
      },
    },

    // Initialize the game state for Player 2, using Player 1's proof
    initGamePlayer2: {
      privateInputs: [
        SelfProof<GameInput, GameOutput>,
        PublicKey,
        Provable.Array(Tile, boardArraySize),
      ],

      async method(
        publicInput: GameInput,
        earlierProof: SelfProof<GameInput, GameOutput>,
        Player2PublicKey: PublicKey,
        player2Board: Tile[]
      ) {
        const BoardHash = hashFieldsWithPoseidon(
          player2Board.map((tile) => tile.id)
        );
        const isVerified = publicInput.signiture.verify(Player2PublicKey, [
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
        for (let i = 0; i < 2; i++) {
          earlierProof.publicOutput.move[i]
            .equals(emptyTiles[i])
            .assertTrue('Move is not equal to emptyTiles!');
        }

        return {
          publicOutput: new GameOutput({
            Player1: earlierProof.publicOutput.Player1,
            Player2: Player2PublicKey,
            Board1Hash: earlierProof.publicOutput.Board1Hash,
            Board2Hash: BoardHash,
            turn: Field(1),
            move: emptyTiles,
            Player1MatchCount: Field(0),
            Player2MatchCount: Field(0),
            Player1PreviousMoves: emptyPreviousMoves,
            Player2PreviousMoves: emptyPreviousMoves,
          }),
        };
      },
    },

    // Method to play a turn in the game
    playTurn: {
      privateInputs: [
        SelfProof<GameInput, GameOutput>,
        Provable.Array(Tile, boardArraySize),
        Provable.Array(Field, 2),
      ],
      async method(
        publicInput: GameInput,
        earlierProof: SelfProof<GameInput, GameOutput>,
        playerBoard: Tile[],
        selectedTiles: Field[]
      ) {
        // Hast the Board for the verify the signiture
        const BoardHash = hashFieldsWithPoseidon(
          playerBoard.map((tile) => tile.id)
        );

        // Determine the current player's public key based on the turn
        const currentPlayerPublicKey = Provable.if(
          earlierProof.publicOutput.turn.equals(Field(1)),
          earlierProof.publicOutput.Player1,
          earlierProof.publicOutput.Player2
        );
        const isVerified = publicInput.signiture.verify(
          currentPlayerPublicKey,
          [BoardHash]
        );
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

        // Calculate the new turn based on the current turn
        const newTurn = Provable.if(
          earlierProof.publicOutput.turn.equals(Field(1)),
          Field(2),
          Field(1)
        );

        // Check if the previous move is made by the player
        const isMoveEmpty = earlierProof.publicOutput.move[0]
          .equals(Field(-1))
          .and(earlierProof.publicOutput.move[1].equals(Field(-1)));

        let tile1 = Field(0);
        let tile2 = Field(0);

        // Use a loop to find the Tiles corresponding to selected indices
        for (let i = 0; i < boardArraySize; i++) {
          tile1 = Provable.if(
            earlierProof.publicOutput.move[0].equals(Field(i)),
            playerBoard[i].id,
            tile1
          );
          tile2 = Provable.if(
            earlierProof.publicOutput.move[1].equals(Field(i)),
            playerBoard[i].id,
            tile2
          );
        }

        // Check if the selected tiles match
        const isTilesMatch = tile1.equals(tile2).and(isMoveEmpty).not();

        //Grab the previous tiles of the player in order to check if user selects the matched tiles again
        const previousMovesToCheck = Provable.switch(
          [
            // Case 1: If the current player is Player1
            currentPlayerPublicKey.equals(earlierProof.publicOutput.Player1),
            // Case 2: If the current player is Player2
            currentPlayerPublicKey.equals(earlierProof.publicOutput.Player2),
          ],
          Provable.Array(Field, boardArraySize), // Explicitly declare the return type
          [
            // Case 1: Check Player2's matched tiles (Player1's turn)
            earlierProof.publicOutput.Player2PreviousMoves,
            // Case 2: Check Player1's matched tiles (Player2's turn)
            earlierProof.publicOutput.Player1PreviousMoves,
          ]
        );

        // Loop through matched tiles to validate selected tiles without using `if`
        for (let i = 0; i < boardArraySize; i++) {
          const isMove0Matched = previousMovesToCheck[i].equals(
            earlierProof.publicOutput.move[0]
          );

          const isMove1Matched = previousMovesToCheck[i].equals(
            earlierProof.publicOutput.move[1]
          );

          //If tiles are matched and any move has already been performed by the player, then throw an error
          isTilesMatch
            .and(isMove0Matched.or(isMove1Matched))
            .assertFalse('Selected Tiles are already matched!');
        }

        // Calculate Player1MatchCount
        const Player1MatchCount = Provable.if(
          isMoveEmpty,
          earlierProof.publicOutput.Player1MatchCount,
          Provable.if(
            isTilesMatch.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player2)
            ),
            earlierProof.publicOutput.Player1MatchCount.add(1),
            earlierProof.publicOutput.Player1MatchCount
          )
        );

        // Calculate Player2MatchCount
        const Player2MatchCount = Provable.if(
          isMoveEmpty,
          earlierProof.publicOutput.Player2MatchCount,
          Provable.if(
            isTilesMatch.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player1)
            ),
            earlierProof.publicOutput.Player2MatchCount.add(1),
            earlierProof.publicOutput.Player2MatchCount
          )
        );

        // Update the previous moves of the player1
        const Player1PreviousMoves = Provable.switch(
          [
            currentPlayerPublicKey
              .equals(earlierProof.publicOutput.Player2)
              .not(),
            isMoveEmpty.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player2)
            ),
            isTilesMatch.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player2)
            ),
          ],
          Provable.Array(Field, boardArraySize),
          [
            earlierProof.publicOutput.Player1PreviousMoves,

            earlierProof.publicOutput.Player1PreviousMoves,

            (() => {
              const updatedTiles = [
                ...earlierProof.publicOutput.Player1PreviousMoves,
              ];
              let replaced = Field(0);

              for (let i = 0; i < boardArraySize; i++) {
                const isEmptySlot = updatedTiles[i].equals(Field(-1));
                const canReplace = replaced.lessThan(Field(2));

                updatedTiles[i] = Provable.if(
                  isEmptySlot.and(canReplace),
                  Provable.if(
                    replaced.equals(Field(0)),
                    earlierProof.publicOutput.move[0],
                    earlierProof.publicOutput.move[1]
                  ),
                  updatedTiles[i]
                );

                replaced = Provable.if(
                  isEmptySlot.and(canReplace),
                  replaced.add(Field(1)),
                  replaced
                );
              }

              return updatedTiles;
            })(),
          ]
        );

        // Update the previous moves of the player2
        const Player2PreviousMoves = Provable.switch(
          [
            currentPlayerPublicKey
              .equals(earlierProof.publicOutput.Player1)
              .not(),
            isMoveEmpty.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player1)
            ),
            isTilesMatch.and(
              currentPlayerPublicKey.equals(earlierProof.publicOutput.Player1)
            ),
          ],
          Provable.Array(Field, boardArraySize),
          [
            earlierProof.publicOutput.Player2PreviousMoves,

            earlierProof.publicOutput.Player2PreviousMoves,

            (() => {
              const updatedTiles = [
                ...earlierProof.publicOutput.Player2PreviousMoves,
              ];
              let replaced = Field(0);

              for (let i = 0; i < boardArraySize; i++) {
                const isEmptySlot = updatedTiles[i].equals(Field(-1));
                const canReplace = replaced.lessThan(Field(2));

                updatedTiles[i] = Provable.if(
                  isEmptySlot.and(canReplace),
                  Provable.if(
                    replaced.equals(Field(0)),
                    earlierProof.publicOutput.move[0],
                    earlierProof.publicOutput.move[1]
                  ),
                  updatedTiles[i]
                );

                replaced = Provable.if(
                  isEmptySlot.and(canReplace),
                  replaced.add(Field(1)),
                  replaced
                );
              }

              return updatedTiles;
            })(),
          ]
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
            Player1PreviousMoves,
            Player2PreviousMoves,
          }),
        };
      },
    },
  },
});
