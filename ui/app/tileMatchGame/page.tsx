"use client";
import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import GameCompleted from "../../components/tileMatchGame/subComponents/GameCompleted";
import { Tile } from "../../components/tileMatchGame/subComponents/Tile";
import ScoreDisplay from "../../components/tileMatchGame/subComponents/ScoreDisplay";
import { useSocketStore } from "../../store/socketStore";
import { useGameStore } from "../../store/gameStore";

export default function TileMatchGame() {
  const [tiles, setTiles] = useState<{ id: string; url: string }[]>([]);
  const userId = useGameStore((state) => state.userId);
  const roomId = useGameStore((state) => state.roomId);

  const flippedTilesRef = useRef<{ id: string; url: string }[]>([]);
  const [flippedBackIds, setFlippedBackIds] = useState<string[]>([]);
  const [matchedTiles, setMatchedTiles] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [disappearingTiles, setDisappearingTiles] = useState<string[]>([]);
  const [userScore, setUserScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [isUserTurn, setIsUserTurn] = useState<boolean>(true);

  const { socket } = useSocketStore();

  useEffect(() => {
    if (socket && userId && roomId) {
      // Emit event to request tiles from the server for the current user
      socket.emit("requestTiles", roomId, userId);

      // Listen for received tiles and set the game tiles and current turn
      socket.on("receiveTiles", ({ tiles: receivedTiles, currentTurn }) => {
        console.log("Tiles received:", receivedTiles);
        setTiles(receivedTiles); // Ensure this is set correctly
        setIsUserTurn(currentTurn === userId);
        console.log(
          `Current turn: ${currentTurn === userId ? "Your" : "Opponent's"} turn`
        );
      });

      // Join the room to ensure the user is part of the room's socket group
      socket.emit("joinRoom", roomId, userId);

      // Listen for updates on the opponent's score
      socket.on(
        "updateOpponentScore",
        ({ userId: scoringUserId, newScore }) => {
          if (scoringUserId !== userId) {
            setOpponentScore(newScore);
            setIsUserTurn(true);
          }
        }
      );

      // Listen for updates on whose turn it is
      socket.on("updateTurn", ({ currentTurn }) => {
        setIsUserTurn(currentTurn === userId);
        console.log(
          `Turn updated: ${currentTurn === userId ? "Your" : "Opponent's"} turn`
        );
      });

      // Cleanup event listeners when the component unmounts or dependencies change
      return () => {
        socket.off("receiveTiles");
        socket.off("updateOpponentScore");
        socket.off("updateTurn");
      };
    }
  }, [socket, userId, roomId]);

  const handleTileFlip = (id: string, url: string) => {
    console.log(`handleTileFlip: ${id}`);
    if (!isUserTurn || isChecking || flippedTilesRef.current.length >= 2)
      return;
    if (flippedTilesRef.current.some((tile) => tile.id === id)) return;

    flippedTilesRef.current.push({ id, url });

    if (flippedTilesRef.current.length === 2) {
      if (socket && roomId && userId) {
        socket.emit("moveMade", { roomId, userId, tileId: id });
      }
      setIsChecking(true);

      if (flippedTilesRef.current[0]?.url === flippedTilesRef.current[1]?.url) {
        const matchedTileIds = flippedTilesRef.current.map((tile) => tile.id);
        setTimeout(() => {
          setMatchedTiles((matched) => [...matched, ...matchedTileIds]);
          flippedTilesRef.current = [];
          setIsChecking(false);
          setUserScore((prevScore) => {
            const newScore = prevScore + 1;
            socket?.emit("updateScore", { roomId, userId, newScore });
            return newScore;
          });
          setIsUserTurn(false);
        }, 1000);
      } else {
        const unmatchedTileIds = flippedTilesRef.current.map((tile) => tile.id);
        setTimeout(() => {
          setFlippedBackIds(unmatchedTileIds);
          flippedTilesRef.current = [];
          setTimeout(() => {
            setFlippedBackIds([]);
            setIsChecking(false);
            setIsUserTurn(false);
          }, 100);
        }, 1000);
      }
    }
  };

  const handleTileDisappear = (id: string) => {
    setDisappearingTiles((prev) => [...prev, id]);
  };

  const canFlipMore =
    isUserTurn && flippedTilesRef.current.length < 2 && !isChecking;
  const isGameCompleted = disappearingTiles.length === tiles.length;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {isGameCompleted ? (
        <GameCompleted
          userMatchedTilesCount={matchedTiles.length / 2}
          opponentMatchedTilesCount={opponentScore}
        />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              height: "5rem",
              width: "100%",
            }}
          >
            <ScoreDisplay label="Your Score" score={userScore} />
            <div>{isUserTurn ? "Your turn" : "Waiting for opponent..."}</div>
            <ScoreDisplay label="Opponent's Score" score={opponentScore} />
          </div>

          <Canvas
            style={{ width: "100%", height: "60rem" }}
            camera={{ position: [0, 0, 20], fov: 75 }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            {tiles.map(
              (tile, index) =>
                !disappearingTiles.includes(tile.id) && (
                  <Tile
                    key={tile.id} // Ensure `key` is unique and consistent
                    id={tile.id}
                    url={tile.url}
                    position={[
                      (index % 4) * 4.5 - 6,
                      Math.floor(index / 4) * 4.5 - 5,
                      0.1 * index,
                    ]}
                    canFlip={canFlipMore}
                    isFlippedExternally={!flippedBackIds.includes(tile.id)}
                    onTileFlip={handleTileFlip}
                    isMatched={matchedTiles.includes(tile.id)}
                    onTileDisappear={handleTileDisappear}
                  />
                )
            )}
          </Canvas>
        </>
      )}
    </div>
  );
}
