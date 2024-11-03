import React from "react";

interface LevelSelectionProps {
  onSelectLevel: (level: number) => void;
}

export default function LevelSelection({ onSelectLevel }: LevelSelectionProps) {
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
      }}
    >
      <h1>Select a Level</h1>
      <button
        style={{
          padding: "10px 20px",
          margin: "10px",
          fontSize: "20px",
          cursor: "pointer",
        }}
        onClick={() => onSelectLevel(1)}
      >
        Level 1 (16 Tiles)
      </button>
      <button
        style={{
          padding: "10px 20px",
          margin: "10px",
          fontSize: "20px",
          cursor: "pointer",
        }}
        onClick={() => onSelectLevel(2)}
      >
        Level 2 (32 Tiles)
      </button>
      <button
        style={{
          padding: "10px 20px",
          margin: "10px",
          fontSize: "20px",
          cursor: "pointer",
        }}
        onClick={() => onSelectLevel(3)}
      >
        Level 3 (48 Tiles)
      </button>
    </div>
  );
}
