"use client";
import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { generateTiles } from "../../components/tileMatchGame/helpers/generateTiles";
import { Tile } from "../../components/tileMatchGame/subComponents/Tile";
import { useGameStore } from "../../store/gameStore";
import { useSocketStore } from "../../store/socketStore";
import { useRouter } from "next/navigation";

interface Tile {
  id: string;
  url: string;
}

const GenerateTilePage: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const userId = useGameStore((state) => state.userId);
  const roomId = useGameStore((state) => state.roomId);
  const userWallet1 = useGameStore((state) => state.userWallet1);
  const userWallet2 = useGameStore((state) => state.userWallet2);
  const [confirmed, setConfirmed] = useState(false);
  const { socket } = useSocketStore();
  const router = useRouter();

  const deployContract = async (deployerKey: string, playerKeys: string[]) => {
    try {
      const response = await fetch("/api/deployGameContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deployerKey, playerKeys }),
      });

      const result = await response.json();
      console.log("Contract deployed:", result);
    } catch (error) {
      console.error("Failed to deploy contract:", error);
    }
  };

  useEffect(() => {
    // Log user wallet information on component mount
    console.log("User Wallet 1:", userWallet1);
    console.log("User Wallet 2:", userWallet2);
    if (userWallet1 && userWallet2) {
      deployContract(userWallet1, [userWallet1, userWallet2]);
    }
  }, [userWallet1, userWallet2]);

  const handleGenerate = () => {
    const newTiles = generateTiles(); // Adjust the count as needed
    setTiles(newTiles);
  };

  const handleConfirmTiles = () => {
    if (userId && roomId && tiles.length > 0) {
      socket.emit("confirmTiles", roomId, userId, tiles);
      setConfirmed(true);
    }
  };

  // Listen for the start game event
  useEffect(() => {
    if (socket) {
      socket.on("startGame", () => {
        console.log("Game is starting!");
        router.push("/tileMatchGame");
      });

      // Cleanup function to remove listeners when the component unmounts
      return () => {
        socket.off("startGame");
      };
    }
  }, [socket, userId, roomId]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px",
          height: "5rem",
          width: "100%",
        }}
      >
        <button onClick={handleGenerate}>Generate Tiles</button>
        <button onClick={handleConfirmTiles} disabled={confirmed}>
          Confirm Tiles
        </button>
      </div>
      <Canvas
        style={{ width: "100%", height: "60rem" }}
        camera={{ position: [0, 0, 20], fov: 75 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {tiles.map((tile, index) => (
          <Tile
            key={tile.id}
            id={tile.id}
            url={tile.url}
            position={[
              (index % 4) * 4.5 - 6,
              Math.floor(index / 4) * 4.5 - 5,
              0,
            ]}
            isPreview={true}
          />
        ))}
      </Canvas>
    </>
  );
};

export default GenerateTilePage;
