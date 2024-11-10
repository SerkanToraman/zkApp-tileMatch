import React from "react";

interface GameCompletedProps {
  userMatchedTilesCount: number; // User's matched tiles count
  opponentMatchedTilesCount: number; // Opponent's matched tiles count
}

const GameCompleted: React.FC<GameCompletedProps> = ({
  userMatchedTilesCount,
  opponentMatchedTilesCount,
}) => {
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
        Your matched tiles count: <strong>{userMatchedTilesCount}</strong>
      </p>
      <p>
        Opponent&apos;s matched tiles count:{" "}
        <strong>{opponentMatchedTilesCount}</strong>
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
