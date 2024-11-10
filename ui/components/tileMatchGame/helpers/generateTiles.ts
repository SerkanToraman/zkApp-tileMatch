// Define the type for a tile
interface Tile {
  id: string;
  url: string;
}

export function generateTiles(): Tile[] {
  // Create an array of all unique tile models (1 to 15)
  const allUniqueTiles: Tile[] = Array.from(
    { length: 15 },
    (_, i): Tile => ({
      id: `tile${i + 1}`,
      url: `/models/tile${i + 1}.glb`,
    })
  );

  // Shuffle the array and select the first 8 tiles
  for (let i = allUniqueTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allUniqueTiles[i], allUniqueTiles[j]] = [
      allUniqueTiles[j],
      allUniqueTiles[i],
    ];
  }

  const selectedTiles = allUniqueTiles.slice(0, 8);

  // Duplicate each selected tile
  const allTiles: Tile[] = [...selectedTiles, ...selectedTiles].map(
    (tile, index): Tile => ({
      ...tile,
      id: `${tile.id}-${index}`, // Ensure each duplicated tile has a unique ID
    })
  );

  // Shuffle the duplicated tiles
  for (let i = allTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
  }

  return allTiles;
}
