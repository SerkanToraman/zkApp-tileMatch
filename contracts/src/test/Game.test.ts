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
import { WinnerProgram } from '../WinnerProgram';
import { DetermineWinner, PlayerScores } from '../DetermineWinner';

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
      await DetermineWinner.compile();
    verificationKey = zkProgramVerificationKey.data;
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
    // Define player scores
    const scores = new PlayerScores({
      player1Score: Field(7),
      player2Score: Field(8),
    });
    // Check initial balances
    const player1InitialBalance = await Mina.getBalance(Player1Account);
    const player2InitialBalance = await Mina.getBalance(Player2Account);

    console.log('Player 1:', Player1Account.toBase58());
    console.log('Player 2:', Player2Account.toBase58());

    // Use WinnerProgram to determine the winner
    const winnerAddress = await WinnerProgram.determineWinnerWithZkProgram(
      scores,
      Player1Account,
      Player2Account,
      verificationKey
    );

    console.log('Winner Address:', winnerAddress.toBase58());

    // Distribute the reward to the winner
    await distributeReward(winnerAddress);

    // Fetch updated balances
    const player1UpdatedBalance = await Mina.getBalance(Player1Account);
    const player2UpdatedBalance = await Mina.getBalance(Player2Account);
    const zkAppUpdatedBalance = await Mina.getBalance(zkAppAddress);

    // Check that the zkApp balance decreased by the reward amount 2_000_000_000 to 0
    expect(zkAppUpdatedBalance).toEqual(UInt64.from(0));
    // Check that the winner's balance increased by the reward amount 2_000_000_000
    expect(player2UpdatedBalance).toEqual(
      player1InitialBalance.add(UInt64.from(2_000_000_000))
    );
    // Check that the loser's balance remained the same
    expect(player1UpdatedBalance).toEqual(player2InitialBalance);
  });
});
