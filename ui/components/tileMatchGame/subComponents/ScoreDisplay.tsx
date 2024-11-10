// components/ScoreDisplay.tsx
import React from "react";

interface ScoreDisplayProps {
  score: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  return (
    <div>
      <strong>Score: {score}</strong>
    </div>
  );
};

export default ScoreDisplay;
