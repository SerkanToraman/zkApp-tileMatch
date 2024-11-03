// components/ScoreDisplay.tsx
import React from "react";

interface ScoreDisplayProps {
  score: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        fontSize: "24px",
        color: "white",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: "10px",
        borderRadius: "8px",
      }}
    >
      <strong>Score: {score}</strong>
    </div>
  );
};

export default ScoreDisplay;
