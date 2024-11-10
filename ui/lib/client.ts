import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

const connectToServer = (): Socket => {
  if (!socket || (socket && !socket.connected)) {
    console.log("Initializing or reconnecting to socket...");
    socket = io("http://localhost:8585"); // Replace with your server URL

    socket.on("connect", () => {
      console.log("Connected to server:", socket!.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      // Optionally attempt to reconnect or handle disconnection logic
    });

    socket.on("reconnect_attempt", () => {
      console.log("Attempting to reconnect...");
    });
  } else {
    console.log("Socket already initialized and connected.");
  }

  return socket;
};

export { connectToServer, socket };
