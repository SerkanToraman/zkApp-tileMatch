"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocketStore } from "../../store/socketStore";
import { useGameStore } from "../../store/gameStore";
import { useWalletStore } from "../../store/walletStore";
import { v4 as uuidv4 } from "uuid";

interface RoomDetails {
  roomId: string;
  users: string[];
  maxUsers: number;
}

const GameRoom: React.FC = () => {
  const [activeRooms, setActiveRooms] = useState<RoomDetails[]>([]);
  const setUserId = useGameStore((state) => state.setUserId);
  const setRoomId = useGameStore((state) => state.setRoomId);
  const clearState = useGameStore((state) => state.clearState);
  const disconnect = useWalletStore((state) => state.disconnect);
  const { initializeSocket, socket } = useSocketStore();
  const walletInfo = useWalletStore((state) => state.walletInfo);
  const userId = useGameStore((state) => state.userId);
  const roomId = useGameStore((state) => state.roomId);
  const setUserWallets = useGameStore((state) => state.setUserWallets);
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      const newUserId = `user-${uuidv4()}`;
      setUserId(newUserId);
      console.log("Generated userId:", newUserId);
    }

    if (walletInfo.isConnected && !socket) {
      initializeSocket(); // Connects the socket if not already connected
    }

    if (socket) {
      socket.on("connect", () => {
        console.log("Connected to server:", socket.id);
      });
      // Emit wallet information to server after connecting
      if (walletInfo.account && userId) {
        socket.emit("userWalletInfo", {
          userId,
          walletAddress: walletInfo.account,
        });
        console.log("Sent wallet information to server:", walletInfo.account);
      }

      socket.on("activeRooms", (rooms: RoomDetails[]) => {
        console.log("Active rooms received:", rooms);
        setActiveRooms(rooms);
      });

      socket.on("DirectGenerateTiles", ({ wallets }) => {
        console.log("Received wallets for DirectGenerateTiles:", wallets);
        setUserWallets(wallets[0], wallets[1]); // Save wallets to gameState
        router.push(`/generateTile`); // Navigate to generateTile page
      });

      // Clean up event listeners on unmount
      return () => {
        socket.off("connect");
        socket.off("activeRooms");
        socket.off("startGame");
      };
    }
  }, [initializeSocket, socket, roomId, setUserId, userId, walletInfo, router]);

  const handleJoinRoom = (id: string) => {
    setRoomId(id);
    console.log("Joining room with id:", id);
    socket?.emit("joinRoom", id, userId || `user-${uuidv4()}`);
  };

  const handleCreateRoom = () => {
    const newRoomId = `room-${uuidv4()}`;
    setRoomId(newRoomId);
    console.log("Creating and joining new room with id:", newRoomId);
    socket?.emit("joinRoom", newRoomId, userId || `user-${uuidv4()}`);
  };

  const handleLogout = () => {
    disconnect();
    clearState();
    if (socket) {
      socket.disconnect();
      console.log("Disconnected from server");
    }
    router.push("/");
  };

  return (
    <div>
      <h2>Available Rooms</h2>
      <ul>
        {activeRooms.map((room) => (
          <li key={room.roomId}>
            Room ID: {room.roomId} | Users: {room.users.length}/{room.maxUsers}
            {room.users.length < room.maxUsers && (
              <button onClick={() => handleJoinRoom(room.roomId)}>
                Join Room
              </button>
            )}
          </li>
        ))}
      </ul>
      <h2>Create a New Room</h2>
      <button onClick={handleCreateRoom}>Create New Room</button>
      <button onClick={handleLogout}>Log Out</button>
    </div>
  );
};

export default GameRoom;
