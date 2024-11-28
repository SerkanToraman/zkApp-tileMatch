import {
  PrivateKey,
  Mina,
  PublicKey,
  UInt64,
  AccountUpdate,
  Field,
  Bool,
  Provable,
  SelfProof,
} from 'o1js';
import { GameContract } from '../GameContract';
import { TileGameLogic } from '../TileGameLogic';
import {
  TileGameProgram,
  PlayerTiles,
  Tile,
  PublicInput,
  GameOutput,
} from '../TileGameProgram';
import { hashUrl } from '../utils/hash';

let proofsEnabled = false;
let verificationKey: string;
let earlierProof: SelfProof<PublicInput, GameOutput>;
let player1Tiles: PlayerTiles;
let player2Tiles: PlayerTiles;
let player1MatchedTiles: Field[] = [];
let player2MatchedTiles: Field[] = [];
let currentStep: Field;

describe('GameContract', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    Player1Account: Mina.TestPublicKey,
    Player1Key: PrivateKey,
    Player2Account: Mina.TestPublicKey,
    Player2Key: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: GameContract;

  beforeAll(async () => {
    if (proofsEnabled) await GameContract.compile();

    const { verificationKey: zkProgramVerificationKey } =
      await TileGameProgram.compile();
    verificationKey = zkProgramVerificationKey.data;
    console.log('ZkProgram compiled successfully.');

    // Set up local blockchain
    const localChain = await Mina.LocalBlockchain({
      proofsEnabled,
    });
    Mina.setActiveInstance(localChain);

    [deployerAccount, Player1Account, Player2Account] = localChain.testAccounts;
    deployerKey = deployerAccount.key;
    Player1Key = Player1Account.key;
    Player2Key = Player2Account.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new GameContract(zkAppAddress);

    // Initialize tiles for Player 1 and Player 2
    player1Tiles = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(1), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(2), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(4), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(3), urlHash: hashUrl('/models/tile1.glb') }),
      ],
    });

    player2Tiles = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(1), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(2), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(4), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(3), urlHash: hashUrl('/models/tile1.glb') }),
      ],
    });

    player1MatchedTiles = new Array(2).fill(Field(0));
    player2MatchedTiles = new Array(2).fill(Field(0));
  });

  async function localDeploy(Player1Key: PrivateKey, Player2Key: PrivateKey) {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
      await zkApp.initGame(Player1Account, Player2Account);
    });
    // Sign the transaction with all required keys
    await txn.prove();
    await txn
      .sign([deployerKey, zkAppPrivateKey, Player1Key, Player2Key])
      .send();
  }

  async function distributeReward(Player1Account: PublicKey) {
    const txn = await Mina.transaction(deployerAccount, async () => {
      await zkApp.distributeReward(Player1Account);
    });

    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    const player1BalanceAfter = await Mina.getBalance(Player1Account);
    const player2BalanceAfter = await Mina.getBalance(Player2Account);
    const zkAppBalanceAfter = await Mina.getBalance(zkAppAddress);

    console.log(
      `Player 1 Balance After game Completed: ${player1BalanceAfter.toString()}`
    );
    console.log(
      `Player 2 Balance After game Completed: ${player2BalanceAfter.toString()}`
    );
    console.log(
      `zkApp Balance After game Completed: ${zkAppBalanceAfter.toString()}`
    );
  }

  it('should deploy the contract', async () => {
    await localDeploy(Player1Key, Player2Key);

    // Check that the zkApp was deployed to the correct address
    expect(zkApp.address).toEqual(zkAppAddress);

    // Check the initial state of player1 and player2
    const player1 = zkApp.player1.get();
    const player2 = zkApp.player2.get();

    expect(player1.toBase58()).toEqual(Player1Account.toBase58());
    expect(player2.toBase58()).toEqual(Player2Account.toBase58());

    // Verify the total amount in the zkApp account
    const balance = await Mina.getBalance(zkAppAddress);
    const player1Balance = await Mina.getBalance(Player1Account);
    const player2Balance = await Mina.getBalance(Player2Account);
    console.log(`Initial zkApp Balance: ${balance.toString()}`);
    console.log(`Initial Player 1 Balance: ${player1Balance.toString()}`);
    console.log(`Initial Player 2 Balance: ${player2Balance.toString()}`);
    expect(balance).toEqual(UInt64.from(2_000_000_000));
  });

  it('Player 1 should initialise the game', async () => {
    const proof = await TileGameLogic.initializeGameForUser1(verificationKey);
    earlierProof = proof;

    const publicOutput = earlierProof.publicOutput;
    currentStep = publicOutput.nextStep;

    expect(earlierProof).toBeDefined();
  });

  it('Player 2 should initialise the game', async () => {
    const proof = await TileGameLogic.initializeGameForUser2(
      earlierProof,
      verificationKey,
      currentStep
    );

    earlierProof = proof;

    const publicOutput = earlierProof.publicOutput;
    currentStep = publicOutput.nextStep;

    expect(earlierProof).toBeDefined();
  });

  it('Player 1 should play turn 1', async () => {
    const allTheTiles = player1Tiles;

    const selectedTiles = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(2), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(3), urlHash: hashUrl('/models/tile1.glb') }),
      ],
    });

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      allTheTiles.tiles,
      selectedTiles.tiles,
      player1MatchedTiles,
      currentStep
    );

    const publicOutput = proof.publicOutput;
    player1MatchedTiles = publicOutput.matchedTiles.map((hash) => Field(hash));
    currentStep = publicOutput.nextStep;
    // Check if `gameOver` is true and distribute reward
    Provable.asProver(() => {
      const isGameOver = publicOutput.gameOver.equals(Bool(true)).toBoolean();

      if (isGameOver) {
        console.log('Distributing reward to Player 1...');
        distributeReward(Player1Account);
      } else {
        console.log('Game is not over yet.');
      }
    });

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });

  it('Player 2 should play turn 1', async () => {
    const allTheTiles = player2Tiles;

    const selectedTiles = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(1), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(4), urlHash: hashUrl('/models/tile2.glb') }),
      ],
    });

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      allTheTiles.tiles,
      selectedTiles.tiles,
      player2MatchedTiles,
      currentStep
    );

    const publicOutput = proof.publicOutput;
    Provable.asProver(() => {
      console.log('publicOutput.gameOver (simplified):', publicOutput.gameOver);
    });

    player2MatchedTiles = publicOutput.matchedTiles.map((hash) => Field(hash));
    currentStep = publicOutput.nextStep;

    Provable.asProver(() => {
      const isGameOver = publicOutput.gameOver.equals(Bool(true)).toBoolean();

      if (isGameOver) {
        console.log('Distributing reward to Player 2...');
        distributeReward(Player1Account);
      } else {
        console.log('Game is not over yet.');
      }
    });

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });
  it('Player 1 should play turn 2', async () => {
    const allTheTiles = player1Tiles;

    const selectedTiles = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(2), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(3), urlHash: hashUrl('/models/tile1.glb') }),
      ],
    });

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      allTheTiles.tiles,
      selectedTiles.tiles,
      player2MatchedTiles,
      currentStep
    );

    const publicOutput = proof.publicOutput;
    Provable.asProver(() => {
      console.log('publicOutput.gameOver (simplified):', publicOutput.gameOver);
    });

    player2MatchedTiles = publicOutput.matchedTiles.map((hash) => Field(hash));
    currentStep = publicOutput.nextStep;

    Provable.asProver(() => {
      const isGameOver = publicOutput.gameOver.equals(Bool(true)).toBoolean();

      if (isGameOver) {
        console.log('Distributing reward to Player 1...');
        distributeReward(Player1Account);
      } else {
        console.log('Game is not over yet.');
      }
    });

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });
});
