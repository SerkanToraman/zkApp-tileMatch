import {
  PrivateKey,
  Mina,
  PublicKey,
  UInt64,
  Bool,
  AccountUpdate,
  Field,
} from 'o1js';
import { GameContract } from '../GameContract';
import { TileGameLogic } from '../TileGameLogic';
import { TileGameProgram, Tile, PlayerTiles } from '../TileGameProgram';
import { hashUrl } from '../utils/hash';

let proofsEnabled = false;
let verificationKey: string;

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
    verificationKey = zkProgramVerificationKey.data; // Store verification key
    console.log('ZkProgram compiled successfully.');
  });

  beforeAll(async () => {
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
  }

  it('should deploy the contract and initialize the game', async () => {
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
    expect(balance).toEqual(UInt64.from(2_000_000_000));
  });
  it('should distribute the reward to the winner', async () => {
    const tilesForPlayer1 = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(1), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(2), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(4), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(3), urlHash: hashUrl('/models/tile1.glb') }),
      ],
    });

    const tilesForPlayer2 = new PlayerTiles({
      tiles: [
        new Tile({ id: Field(5), urlHash: hashUrl('/models/tile2.glb') }),
        new Tile({ id: Field(6), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(7), urlHash: hashUrl('/models/tile1.glb') }),
        new Tile({ id: Field(8), urlHash: hashUrl('/models/tile2.glb') }),
      ],
    });

    // Use TileGameLogic to initialize the game
    const proof = await TileGameLogic.initializeGame(
      Player1Account,
      Player2Account,
      tilesForPlayer1,
      tilesForPlayer2,
      verificationKey
    );

    expect(proof).toBeDefined();
    console.log('proof.', proof);
    console.log('Tile game initialized successfully.');
  });
});
