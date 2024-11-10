import { create } from "zustand";
import { Socket } from "socket.io-client";
import { connectToServer } from "../lib/client";

interface SocketStore {
  socket: Socket | null;
  initializeSocket: () => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  initializeSocket: () => {
    const existingSocket = get().socket;
    if (!existingSocket || !existingSocket.connected) {
      const socketInstance = connectToServer();
      set({ socket: socketInstance });
    }
  },
}));
