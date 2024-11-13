import {
  SmartContract,
  method,
  AccountUpdate,
  state,
  State,
  PublicKey,
  UInt64,
} from 'o1js';

export class GameContract extends SmartContract {
  @state(PublicKey) player1 = State<PublicKey>();
  @state(PublicKey) player2 = State<PublicKey>();
  @state(UInt64) totalAmount = State<UInt64>();

  @method async initGame(player1Address: PublicKey, player2Address: PublicKey) {
    this.player1.set(player1Address);
    this.player2.set(player2Address);

    const sender = this.sender.getUnconstrained();
    const senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.send({ to: this.address, amount: UInt64.from(1_000_000_000) });
  }

  @method async distributeReward(winnerAddress: PublicKey) {
    const p1 = this.player1.getAndRequireEquals();
    const p2 = this.player2.getAndRequireEquals();

    const isWinnerValid = winnerAddress.equals(p1).or(winnerAddress.equals(p2));
    isWinnerValid.assertTrue('Winner must be one of the two players');

    this.send({ to: winnerAddress, amount: UInt64.from(2_000_000_000) });
  }
}
