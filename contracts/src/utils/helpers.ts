import {
  Field,
  Mina,
  PublicKey,
  Provable,
  AccountUpdate,
  PrivateKey,
} from 'o1js';
import { createHash } from 'crypto';
import { GameContract } from './types';

export function hashUrl(url: string): Field {
  const hash = createHash('sha256').update(url).digest('hex'); // Compute SHA-256 hash
  const hashNumber = BigInt(`0x${hash.slice(0, 16)}`); // Use the first 16 characters for simplicity
  return Field(hashNumber);
}

export function checkGameOverAndDistributeReward(
  matchedTiles: Field[],
  currentPlayerAccount: PublicKey,
  deployerAccount: Mina.TestPublicKey,
  deployerKey: PrivateKey,
  zkApp: GameContract,
  zkAppPrivateKey: PrivateKey,
  zkAppAddress: PublicKey,
  otherPlayerAccount: PublicKey
) {
  Provable.asProver(() => {
    let nonZeroMatchedTileCount = 0;

    // Loop through matchedTiles to count non-zero values
    for (let i = 0; i < matchedTiles.length; i++) {
      if (matchedTiles[i].equals(Field(0)).not().toBoolean()) {
        nonZeroMatchedTileCount++;
      }
    }

    // Check if the number of non-zero matched tiles is 2
    const isGameOver = nonZeroMatchedTileCount === 2;

    if (isGameOver) {
      console.log(`Distributing reward to Player...`);

      // Call distributeReward directly
      distributeReward(
        deployerAccount,
        deployerKey,
        zkApp,
        zkAppPrivateKey,
        zkAppAddress,
        currentPlayerAccount,
        otherPlayerAccount
      );
    } else {
      console.log('Game is not over yet.');
    }
  });
}

export async function deployZkApp(
  deployerAccount: Mina.TestPublicKey,
  deployerKey: PrivateKey,
  zkApp: GameContract,
  zkAppPrivateKey: PrivateKey,
  Player1Account: Mina.TestPublicKey,
  Player2Account: Mina.TestPublicKey,
  Player1Key: PrivateKey,
  Player2Key: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, async () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    await zkApp.deploy();
    await zkApp.initGame(Player1Account, Player2Account);
  });

  // Sign the transaction with all required keys
  await txn.prove();
  await txn.sign([deployerKey, zkAppPrivateKey, Player1Key, Player2Key]).send();
}

export async function distributeReward(
  deployerAccount: Mina.TestPublicKey,
  deployerKey: PrivateKey,
  zkApp: GameContract,
  zkAppPrivateKey: PrivateKey,
  zkAppAddress: PublicKey,
  winnerAccount: PublicKey,
  otherPlayerAccount: PublicKey
) {
  const txn = await Mina.transaction(deployerAccount, async () => {
    await zkApp.distributeReward(winnerAccount);
  });

  await txn.prove();
  await txn.sign([deployerKey, zkAppPrivateKey]).send();

  const winnerBalanceAfter = await Mina.getBalance(winnerAccount);
  const loserBalanceAfter = await Mina.getBalance(otherPlayerAccount);
  const zkAppBalanceAfter = await Mina.getBalance(zkAppAddress);

  console.log(
    `Winner Balance After game Completed: ${winnerBalanceAfter.toString()}`
  );
  console.log(
    `Loser Balance After game Completed: ${loserBalanceAfter.toString()}`
  );
  console.log(
    `zkApp Balance After game Completed: ${zkAppBalanceAfter.toString()}`
  );
}
