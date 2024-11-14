import { create } from "zustand";

interface GameState {
  userId: string | null;
  roomId: string | null;
  gameTiles: { id: string; url: string }[];
  userWallet1: string | null;
  userWallet2: string | null;
  setUserId: (id: string) => void;
  setRoomId: (id: string) => void;
  setGameTiles: (tiles: { id: string; url: string }[]) => void;
  setUserWallets: (wallet1: string, wallet2: string) => void;
  clearState: () => void; // Add the clearState function
}

export const useGameStore = create<GameState>((set) => ({
  userId: null,
  roomId: null,
  gameTiles: [],
  userWallet1: null,
  userWallet2: null,
  setUserId: (id) => set({ userId: id }),
  setRoomId: (id) => set({ roomId: id }),
  setGameTiles: (tiles) => set({ gameTiles: tiles }),
  setUserWallets: (wallet1, wallet2) =>
    set({ userWallet1: wallet1, userWallet2: wallet2 }),
  clearState: () =>
    set({
      userId: null,
      roomId: null,
      gameTiles: [],
      userWallet1: null,
      userWallet2: null,
    }),
}));
