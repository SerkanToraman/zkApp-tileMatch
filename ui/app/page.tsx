"use client";

import "./reactCOIServiceWorker";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Import the useRouter hook
import { useWalletStore } from "../store/walletStore";
import { useSmartContractStore } from "../store/smartContractStore";

export default function Home() {
  const router = useRouter(); // Initialize the router
  const { walletInfo, connect } = useWalletStore();
  const {
    setupZkapp,
    createTransaction,
    displayText,
    transactionLink,
    hasBeenSetup,
  } = useSmartContractStore();

  // Redirect to GameRoom when wallet is connected
  useEffect(() => {
    if (walletInfo.isConnected) {
      router.push("/gameRoom"); // Replace with the correct path to GameRoom
    }
  }, [walletInfo.isConnected, router]);

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>

      <div style={{ padding: "20px" }}>
        {/* Wallet Connect Button */}
        {!walletInfo.isConnected ? (
          <button
            onClick={connect}
            style={{ padding: "10px 20px", fontSize: "16px" }}
          >
            Connect Wallet
          </button>
        ) : (
          <div>
            <h3>Wallet Connected</h3>
            <p>
              <strong>Account:</strong> {walletInfo.account}
            </p>
            <p>
              <strong>Network:</strong> {walletInfo.network?.networkID}
            </p>
          </div>
        )}

        {/* Setup zkApp Button */}
        {walletInfo.isConnected && !hasBeenSetup && (
          <button
            onClick={setupZkapp}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              marginTop: "10px",
            }}
          >
            Setup zkApp
          </button>
        )}

        {/* Create Transaction Button */}
        {walletInfo.isConnected && hasBeenSetup && (
          <button
            onClick={createTransaction}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              marginTop: "10px",
            }}
          >
            Create Transaction
          </button>
        )}

        {/* Display transaction status or link */}
        {displayText && <p style={{ marginTop: "10px" }}>{displayText}</p>}
        {transactionLink && (
          <p style={{ marginTop: "10px" }}>
            Transaction created!{" "}
            <a href={transactionLink} target="_blank" rel="noreferrer">
              View on MinaScan
            </a>
          </p>
        )}
      </div>
    </>
  );
}
