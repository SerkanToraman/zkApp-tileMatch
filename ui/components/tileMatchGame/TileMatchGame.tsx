import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { fetchTiles, verifyMatch, fetchFinalScore } from "./hooks/useTileGame";
import GameCompleted from "./subComponents/GameCompleted";
import LevelSelection from "./subComponents/LevelSelection";
import { calculateTilePosition } from "./helpers/calculateTilePosition";
import { Tile } from "./subComponents/Tile";
import ScoreDisplay from "./subComponents/ScoreDisplay";
import Timer from "./subComponents/Timer";

export default function TileMatchGame() {
  const [sessionId, setSessionId] = useState<string>(""); // Track sessionId for each game
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [tiles, setTiles] = useState<{ id: string; url: string }[]>([]);
  const flippedTilesRef = useRef<{ id: string; url: string }[]>([]);
  const [flippedBackIds, setFlippedBackIds] = useState<string[]>([]);
  const [matchedTiles, setMatchedTiles] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [disappearingTiles, setDisappearingTiles] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [resetTimer, setResetTimer] = useState(false);
  const [formattedTime, setFormattedTime] = useState<string>("");
  const [finalScore, setFinalScore] = useState<number>(0);

  // Fetch tiles from the server based on the selected level
  useEffect(() => {
    if (selectedLevel !== null) {
      const fetchTilesFromServer = async () => {
        try {
          const tileCount = selectedLevel * 8;
          const { sessionId, tiles } = await fetchTiles(
            tileCount,
            selectedLevel
          ); // Use imported fetchTiles
          setSessionId(sessionId);
          setTiles(tiles);
          setResetTimer(true);
          setTimeout(() => setResetTimer(false), 100);
        } catch (error) {
          console.error("Error fetching tiles:", error);
        }
      };
      fetchTilesFromServer();
    }
  }, [selectedLevel]);

  const handleTileFlip = async (id: string, url: string) => {
    if (isChecking || flippedTilesRef.current.length >= 2) return;
    if (flippedTilesRef.current.some((tile) => tile.id === id)) return;
    flippedTilesRef.current.push({ id, url });

    if (flippedTilesRef.current.length === 2) {
      setIsChecking(true);

      const [tile1, tile2] = flippedTilesRef.current;
      if (tile1 && tile2) {
        try {
          const { isMatch } = await verifyMatch({
            sessionId,
            id1: tile1.id,
            id2: tile2.id,
          });
          if (isMatch) {
            const matchedTileIds = [tile1.id, tile2.id];
            setTimeout(() => {
              setMatchedTiles((matched) => [...matched, ...matchedTileIds]);
              flippedTilesRef.current = [];
              setIsChecking(false);
            }, 1000);
          } else {
            const unmatchedTileIds = [tile1.id, tile2.id];
            setTimeout(() => {
              setFlippedBackIds(unmatchedTileIds);
              flippedTilesRef.current = [];
              setTimeout(() => {
                setFlippedBackIds([]);
                setIsChecking(false);
              }, 100);
            }, 1000);
          }
        } catch (error) {
          console.error("Error verifying match:", error);
        }
      } else {
        console.error("Tiles not found for verification.");
      }
    }
  };

  const handleTileDisappear = (id: string) => {
    setDisappearingTiles((prev) => [...prev, id]);
  };

  const canFlipMore = flippedTilesRef.current.length < 2 && !isChecking;
  const isGameCompleted = disappearingTiles.length === tiles.length;

  useEffect(() => {
    if (isGameCompleted) {
      const fetchScoreFromServer = async () => {
        try {
          const { score, time, finalScore } = await fetchFinalScore({
            sessionId,
          });
          setScore(score);
          setFormattedTime(time.toString());
          setFinalScore(finalScore);
        } catch (error) {
          console.error("Error fetching final score data:", error);
        }
      };
      fetchScoreFromServer();
    }
  }, [isGameCompleted]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {!selectedLevel ? (
        <LevelSelection
          onSelectLevel={(level) => {
            setSelectedLevel(level);
          }}
        />
      ) : isGameCompleted ? (
        <GameCompleted
          score={score}
          time={formattedTime}
          finalScore={finalScore}
        />
      ) : (
        <>
          <ScoreDisplay score={score} />
          <Timer
            isGameCompleted={isGameCompleted}
            reset={resetTimer}
            onTimeUpdate={setFormattedTime}
          />
          <Canvas camera={{ position: [0, 0, 25], fov: 75 }}>
            <ambientLight intensity={2} />
            <directionalLight position={[1, 1, 1]} intensity={0.5} />
            {tiles.map((tile, index) => {
              const totalTiles = tiles.length;
              const { x, y } = calculateTilePosition(index, totalTiles);

              return disappearingTiles.includes(tile.id) ? null : (
                <Tile
                  key={tile.id}
                  id={tile.id}
                  url={tile.url}
                  position={[x, y, 0]}
                  offset={-2}
                  canFlip={canFlipMore}
                  isFlippedExternally={!flippedBackIds.includes(tile.id)}
                  onTileFlip={handleTileFlip}
                  isMatched={matchedTiles.includes(tile.id)}
                  onTileDisappear={handleTileDisappear}
                />
              );
            })}
          </Canvas>
        </>
      )}
    </div>
  );
}
