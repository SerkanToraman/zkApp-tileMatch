import { Field, Bool, ZkProgram, SelfProof, Provable } from 'o1js';
import { GameInput, GameOutput, Tile } from './utils/types';
import { hashUrl } from './utils/helpers';

// Define the TileGameProgram
export const TileGameProgram = ZkProgram({
  name: 'tile-game',
  publicInput: GameInput,
  publicOutput: GameOutput,

  methods: {
    // Initialize the game state for Player 1
    initGamePlayer1: {
      privateInputs: [Provable.Array(Tile, 4)],

      async method(publicInput: GameInput, player1Tiles: Tile[]) {
        const nextStep = Field(2);
        const BoardHash = hashUrl(
          player1Tiles.map((tile) => tile.id).join(',')
        );

        // Perform the signature verification
        const isVerified = publicInput.signiture.verify(publicInput.PublicKey, [
          BoardHash,
        ]);
        Provable.log('Signature verification (Provable.log):', isVerified);

        // Handle failed verification
        if (!isVerified) {
          throw new Error('Signature verification failed!');
        }

        return {
          publicOutput: new GameOutput({
            nextStep: nextStep,
            matchedTiles: new Array(2).fill(Field(0)),
          }),
        };
      },
    },

    // // Initialize the game state for Player 2, using Player 1's proof
    // initGamePlayer2: {
    //   privateInputs: [SelfProof<GameInput, GameOutput>],

    //   async method(
    //     publicInput: GameInput,
    //     earlierProof: SelfProof<GameInput, GameOutput>
    //   ) {
    //     earlierProof.verify();

    //     const nextStep = earlierProof.publicOutput.nextStep.add(Field(1));

    //     return {
    //       publicOutput: new GameOutput({
    //         nextStep: nextStep,
    //         matchedTiles: earlierProof.publicOutput.matchedTiles,
    //       }),
    //     };
    //   },
    // },

    // // Method to play a turn in the game
    // playTurn: {
    //   privateInputs: [
    //     Provable.Array(Tile, 4), // Private input: all the tiles
    //     Provable.Array(Field, 2), // Private input: previously matched tiles
    //     SelfProof<GameInput, GameOutput>, // Proof of previous game state
    //   ],

    //   async method(
    //     publicInput: GameInput,
    //     allTheTiles: Tile[], // Array of all tile hashes
    //     previouslyMatchedTiles: Field[], // Previously matched tiles
    //     earlierProof: SelfProof<GameInput, GameOutput>
    //   ) {
    //     earlierProof.verify();

    //     // Validate that selected tiles are part of allTheTiles
    //     for (let i = 0; i < publicInput.selectedTiles.length; i++) {
    //       const selectedTile = publicInput.selectedTiles[i];
    //       let tileExists = Bool(false);

    //       for (let j = 0; j < allTheTiles.length; j++) {
    //         const allTile = allTheTiles[j];
    //         tileExists = tileExists.or(allTile.id.equals(selectedTile.id));
    //       }

    //       tileExists.assertTrue('Selected tile is not part of allTheTiles');
    //     }

    //     // Extract selected tiles
    //     const [tile1, tile2] = publicInput.selectedTiles;

    //     // Check if the two selected tiles are the same
    //     const areTilesMatched = tile1.id.equals(tile2.id);

    //     // Use Provable.switch to handle the matched and unmatched cases
    //     const newMatchedHashes = Provable.switch(
    //       [areTilesMatched, areTilesMatched.not()],
    //       Provable.Array(Field, 2), // Type of the output
    //       [
    //         // Case: Tiles are matched
    //         (() => {
    //           // Ensure the selected tile is not already matched
    //           for (let i = 0; i < previouslyMatchedTiles.length; i++) {
    //             previouslyMatchedTiles[i].assertNotEquals(
    //               tile1.id,
    //               `Selected tile is already matched.`
    //             );
    //           }

    //           // Replace the first occurrence of Field(0) in previouslyMatchedTiles
    //           const updatedHashes = [...previouslyMatchedTiles];
    //           let replaced = Bool(false);

    //           for (let i = 0; i < updatedHashes.length; i++) {
    //             const isDefaultHash = updatedHashes[i].equals(Field(0));

    //             updatedHashes[i] = Provable.if(
    //               isDefaultHash.and(replaced.not()), // Replace only the first Field(0)
    //               tile1.id, // Replacement value
    //               updatedHashes[i] // Keep the original value
    //             );

    //             replaced = replaced.or(isDefaultHash);
    //           }

    //           return updatedHashes; // Ensure the array size remains 2
    //         })(),
    //         // Case: Tiles are not matched
    //         previouslyMatchedTiles,
    //       ]
    //     );

    //     // Compute the next step
    //     const nextStep = earlierProof.publicOutput.nextStep.add(Field(1));

    //     // Return updated game output
    //     return {
    //       publicOutput: new GameOutput({
    //         nextStep: nextStep,
    //         matchedTiles: newMatchedHashes,
    //       }),
    //     };
    //   },
    // },
  },
});
