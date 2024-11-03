// components/GameCompleted.tsx

import React from "react";

interface GameCompletedProps {
  score: number;
  time: string;
  finalScore: number; // Add finalScore to the props
}

const GameCompleted: React.FC<GameCompletedProps> = ({
  score,
  time,
  finalScore,
}) => {
  // Import the smart contract signing function from the Zustand store

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        fontSize: "24px",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      <h1>🎉 Game Completed! 🎉</h1>
      <p>
        Your final score is: <strong>{finalScore}</strong>
      </p>
      <p>
        Original Score: <strong>{score}</strong>
      </p>
      <p>
        Time taken: <strong>{time}</strong>
      </p>
      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "18px",
          cursor: "pointer",
        }}
        onClick={() => window.location.reload()} // Reload the page to restart the game
      >
        Play Again
      </button>
    </div>
  );
};

export default GameCompleted;
