import {
  PrivateKey,
  Mina,
  PublicKey,
  UInt64,
  Field,
  SelfProof,
  Signature,
} from 'o1js';
import { GameContract } from '../GameContract';
import { TileGameLogic } from '../utils/TileGameSteps';
import { TileGameProgram } from '../TileGameProgram';
import {
  hashUrl,
  checkGameOverAndDistributeReward,
  deployZkApp,
  hashFieldsWithPoseidon,
} from '../utils/helpers';
import { PlayerTiles, Tile, GameInput, GameOutput } from '../utils/types';

let proofsEnabled = false;
let verificationKey: string;
let earlierProof: SelfProof<GameInput, GameOutput>;
let player1Tiles: PlayerTiles;
let player2Tiles: PlayerTiles;
let Board1Hash: Field;
let Board2Hash: Field;
let player1Signature: Signature;
let player2Signature: Signature;

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
        new Tile({ id: hashUrl('/models/tile1.glb') }),
        new Tile({ id: hashUrl('/models/tile2.glb') }),
        new Tile({ id: hashUrl('/models/tile1.glb') }),
        new Tile({ id: hashUrl('/models/tile2.glb') }),
      ],
    });

    Board1Hash = hashFieldsWithPoseidon(
      player1Tiles.tiles.map((tile) => tile.id)
    );

    player1Signature = Signature.create(Player1Key, [Board1Hash]);

    player2Tiles = new PlayerTiles({
      tiles: [
        new Tile({ id: hashUrl('/models/tile2.glb') }),
        new Tile({ id: hashUrl('/models/tile1.glb') }),
        new Tile({ id: hashUrl('/models/tile2.glb') }),
        new Tile({ id: hashUrl('/models/tile1.glb') }),
      ],
    });
    Board2Hash = hashFieldsWithPoseidon(
      player2Tiles.tiles.map((tile) => tile.id)
    );

    player2Signature = Signature.create(Player2Key, [Board2Hash]);
  });

  it('should deploy the contract', async () => {
    await deployZkApp(
      deployerAccount,
      deployerKey,
      zkApp,
      zkAppPrivateKey,
      Player1Account,
      Player2Account,
      Player1Key,
      Player2Key
    );

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
    const proof = await TileGameLogic.initializeGameForUser1(
      verificationKey,
      Player1Account,
      player1Signature,
      player1Tiles.tiles
    );
    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });

  it('Player 2 should initialise the game', async () => {
    const proof = await TileGameLogic.initializeGameForUser2(
      earlierProof,
      verificationKey,
      Player2Account,
      player2Signature,
      player2Tiles.tiles
    );
    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });

  it('Player 1 should play turn 1', async () => {
    const selectedTiles = {
      tiles: [
        { id: hashUrl('/models/tile1.glb') },
        { id: hashUrl('/models/tile1.glb') },
      ],
    };

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      Player1Account,
      player1Signature,
      player1Tiles.tiles,
      selectedTiles.tiles
    );

    checkGameOverAndDistributeReward(
      proof.publicOutput.Player2MatchCount,
      Player2Account,
      deployerAccount,
      deployerKey,
      zkApp,
      zkAppPrivateKey,
      zkAppAddress,
      Player1Account
    );

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });

  it('Player 2 should play turn 1', async () => {
    const selectedTiles = new PlayerTiles({
      tiles: [
        new Tile({ id: hashUrl('/models/tile2.glb') }),
        new Tile({ id: hashUrl('/models/tile2.glb') }),
      ],
    });

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      Player2Account,
      player2Signature,
      player2Tiles.tiles,
      selectedTiles.tiles
    );
    checkGameOverAndDistributeReward(
      proof.publicOutput.Player1MatchCount,
      Player1Account,
      deployerAccount,
      deployerKey,
      zkApp,
      zkAppPrivateKey,
      zkAppAddress,
      Player2Account
    );

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });
  it('Player 1 should play turn 2', async () => {
    const selectedTiles = new PlayerTiles({
      tiles: [
        new Tile({ id: hashUrl('/models/tile2.glb') }),
        new Tile({ id: hashUrl('/models/tile2.glb') }),
      ],
    });

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      Player1Account,
      player1Signature,
      player1Tiles.tiles,
      selectedTiles.tiles
    );
    checkGameOverAndDistributeReward(
      proof.publicOutput.Player2MatchCount,
      Player2Account,
      deployerAccount,
      deployerKey,
      zkApp,
      zkAppPrivateKey,
      zkAppAddress,
      Player1Account
    );

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });
  it('Player 2 should play turn 2', async () => {
    const selectedTiles = {
      tiles: [
        { id: hashUrl('/models/tile1.glb') },
        { id: hashUrl('/models/tile1.glb') },
      ],
    };

    const proof = await TileGameLogic.playTurn(
      earlierProof,
      verificationKey,
      Player2Account,
      player2Signature,
      player2Tiles.tiles,
      selectedTiles.tiles
    );

    checkGameOverAndDistributeReward(
      proof.publicOutput.Player1MatchCount,
      Player1Account,
      deployerAccount,
      deployerKey,
      zkApp,
      zkAppPrivateKey,
      zkAppAddress,
      Player2Account
    );

    earlierProof = proof;

    expect(earlierProof).toBeDefined();
  });
});
