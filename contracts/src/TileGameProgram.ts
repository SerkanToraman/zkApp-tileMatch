import {
  Field,
  Bool,
  Struct,
  ZkProgram,
  SelfProof,
  Provable,
  Poseidon,
} from 'o1js';

// Define a Tile as a struct
export class Tile extends Struct({
  id: Field, // Representing a unique tile identifier
  urlHash: Field, // A hash of the URL for privacy
}) {}
// Define the PublicInput structure
export class PublicInput extends Struct({
  currentStep: Field,
  selectedTiles: Provable.Array(Tile, 2),
}) {}

// Define the Output structure
export class GameOutput extends Struct({
  isGameStarted: Bool, // Boolean to indicate if the game started
  nextStep: Field, // Current step of the game
  matchedTiles: Provable.Array(Field, 2), // Array to store matched tiles
  matched: Bool, // Boolean to indicate if
  gameOver: Bool,
}) {}

// Define PlayerTiles as a struct
export class PlayerTiles extends Struct({
  tiles: [Tile], // An array of Tile structs
}) {}

export const PlayerTilesZK = Provable.Array(Tile, 4);

// Define the TileGameProgram
export const TileGameProgram = ZkProgram({
  name: 'tile-game',
  publicInput: PublicInput,
  publicOutput: GameOutput,

  methods: {
    // Initialize the game state for Player 1
    initGamePlayer1: {
      privateInputs: [],

      async method(publicInput: PublicInput) {
        // Ensure the step starts at 1 for Player 1
        publicInput.currentStep.assertEquals(
          Field(1),
          'Player 1 is not in the correct step'
        );
        const nextStep = Field(2);

        return {
          publicOutput: new GameOutput({
            isGameStarted: Bool(true),
            nextStep: nextStep,
            matchedTiles: new Array(2).fill(Field(0)),
            matched: Bool(false),
            gameOver: Bool(false),
          }),
        };
      },
    },

    // Initialize the game state for Player 2, using Player 1's proof
    initGamePlayer2: {
      privateInputs: [SelfProof<PublicInput, GameOutput>],

      async method(
        publicInput: PublicInput,
        earlierProof: SelfProof<PublicInput, GameOutput>
      ) {
        earlierProof.verify();

        // Ensure Player 1 has already initialized the game
        earlierProof.publicOutput.nextStep.assertEquals(
          publicInput.currentStep,
          'Player is not in the correct step'
        );
        const nextStep = earlierProof.publicOutput.nextStep.add(Field(1));

        return {
          publicOutput: new GameOutput({
            isGameStarted: Bool(true),
            nextStep: nextStep,
            matchedTiles: earlierProof.publicOutput.matchedTiles,
            matched: Bool(false),
            gameOver: Bool(false),
          }),
        };
      },
    },

    // Method to play a turn in the game
    playTurn: {
      privateInputs: [
        Provable.Array(Tile, 4), // Private input: all the tiles
        Provable.Array(Field, 2), // Private input: previously matched tiles
        SelfProof<PublicInput, GameOutput>, // Proof of previous game state
      ],

      async method(
        publicInput: PublicInput,
        allTheTiles: Tile[], // Array of all tile hashes
        previouslyMatchedTiles: Field[], // Previously matched tiles
        earlierProof: SelfProof<PublicInput, GameOutput>
      ) {
        earlierProof.verify();
        // If the game is already over, reject any further actions
        earlierProof.publicOutput.gameOver
          .not()
          .assertTrue('The game is already over.');

        // Ensure the current step matches
        publicInput.currentStep.assertEquals(
          earlierProof.publicOutput.nextStep,
          'Player is not in the correct step'
        );

        // Validate that selected tiles are part of allTheTiles
        publicInput.selectedTiles.forEach((selectedTile) => {
          const tileExists = allTheTiles.map((allTile) =>
            allTile.id
              .equals(selectedTile.id)
              .and(allTile.urlHash.equals(selectedTile.urlHash))
          );

          const isTileInAllTiles = tileExists.reduce(
            (acc, curr) => acc.or(curr),
            Bool(false)
          );

          isTileInAllTiles.assertTrue(
            'Selected tile is not part of allTheTiles'
          );
        });

        // Extract selected tiles
        const [tile1, tile2] = publicInput.selectedTiles;

        // Check if the two selected tiles are the same
        const areTilesMatched = tile1.urlHash.equals(tile2.urlHash);
        Provable.asProver(() => {
          console.log(
            'areTilesMatched (resolved):',
            areTilesMatched.toBoolean()
          );
        });

        // Log `previouslyMatchedTiles` before update
        Provable.asProver(() => {
          console.log(
            'previouslyMatchedTiles before update:',
            previouslyMatchedTiles.map((tile) => tile.toString())
          );
        });

        // Update matched tiles conditionally if the selected tiles match
        const updatedMatchedTiles = Provable.switch(
          [areTilesMatched, areTilesMatched.not()], // Mask: Either matched or not
          Provable.Array(Field, 2),
          [
            // Case when tiles match
            (() => {
              // Ensure the selected tiles are not already matched
              previouslyMatchedTiles.forEach((matchedHash) => {
                const selectedTilesHash = Poseidon.hash([
                  tile1.id,
                  tile1.urlHash,
                  tile2.id,
                  tile2.urlHash,
                ]);

                matchedHash.assertNotEquals(
                  selectedTilesHash,
                  `Hash of the selected tiles is already matched`
                );
              });

              // Hash `tile1` and `tile2` together
              const selectedTilesHash = Poseidon.hash([
                tile1.id,
                tile1.urlHash,
                tile2.id,
                tile2.urlHash,
              ]);

              // Replace only the first occurrence of Field(0)
              const newMatchedHashes = previouslyMatchedTiles.map(
                (hash, index) => {
                  let isDefaultHash = hash.equals(Field(0));
                  let isFirstDefaultHash = isDefaultHash.and(
                    Provable.if(
                      previouslyMatchedTiles
                        .slice(0, index)
                        .map((h) => h.equals(Field(0)))
                        .reduce((acc, curr) => acc.or(curr), Bool(false)),
                      Bool(false),
                      Bool(true)
                    )
                  );

                  return Provable.switch(
                    [isFirstDefaultHash, isFirstDefaultHash.not()],
                    Field,
                    [
                      selectedTilesHash, // Replace the first 0
                      hash, // Keep the rest unchanged
                    ]
                  );
                }
              );

              // Log updated matched hashes for debugging
              Provable.asProver(() => {
                console.log(
                  'updatedMatchedHashes:',
                  newMatchedHashes.map((hash) => hash.toString())
                );
              });

              // Ensure the array remains size 2
              return newMatchedHashes.slice(0, 2);
            })(),
            // Case when tiles do not match
            previouslyMatchedTiles,
          ]
        );

        // Check if all tiles are matched
        const isGameWon = updatedMatchedTiles
          .map((hash) => hash.equals(Field(0)).not()) // Check if each hash is not Field(0)
          .reduce((acc, curr) => acc.and(curr), Bool(true));

        Provable.asProver(() => {
          console.log('isGameWon (resolved):', isGameWon.toBoolean());
        });

        const gameOver = Bool(isGameWon);

        // Compute the next step
        const nextStep = earlierProof.publicOutput.nextStep.add(Field(1));

        // Return updated game output
        return {
          publicOutput: new GameOutput({
            isGameStarted: Bool(true),
            nextStep: nextStep,
            matchedTiles: updatedMatchedTiles,
            matched: areTilesMatched,
            gameOver: gameOver,
          }),
        };
      },
    },
  },
});
