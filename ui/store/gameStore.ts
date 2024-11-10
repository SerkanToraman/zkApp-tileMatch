import { create } from "zustand";

interface GameState {
  userId: string | null;
  roomId: string | null;
  setUserId: (id: string) => void;
  setRoomId: (id: string) => void;
  gameTiles: { id: string; url: string }[];
  setGameTiles: (tiles: { id: string; url: string }[]) => void;
  clearState: () => void; // Add the clearState function
}

export const useGameStore = create<GameState>((set) => ({
  userId: null,
  roomId: null,
  setUserId: (id) => set({ userId: id }),
  setRoomId: (id) => set({ roomId: id }),
  gameTiles: [],
  setGameTiles: (tiles) => set({ gameTiles: tiles }),
  clearState: () => set({ userId: null, roomId: null, gameTiles: [] }),
}));
