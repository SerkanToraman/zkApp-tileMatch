import { Server } from "socket.io";
import { PrivateKey, PublicKey } from "o1js";
import { deployGameContract } from "../ui/lib/contract/deployGameContract";

const io = new Server(8585, {
  cors: {
    origin: "*", // Adjust for your client URL if necessary
  },
});

interface RoomDetails {
  roomId: string;
  users: string[];
  maxUsers: number;
  scores: Record<string, number>; // Store scores for each user
  currentTurn: string; // Track the user whose turn it is
}
interface Tile {
  id: string;
  url: string;
}

const activeRooms: Record<string, RoomDetails> = {};
const confirmedTiles: Record<string, { [userId: string]: Tile[] }> = {};
const userWallets: Record<string, string> = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Emit the initial list of active rooms when a user connects
  socket.emit("activeRooms", Object.values(activeRooms));

  // Listen for userWalletInfo event to store user's wallet address
  socket.on("userWalletInfo", ({ userId, walletAddress }) => {
    userWallets[userId] = walletAddress; // Store the wallet address
    console.log(`Stored wallet address for user ${userId}: ${walletAddress}`);
  });

  socket.on("joinRoom", async (roomId: string, userId: string) => {
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = {
        roomId,
        users: [],
        maxUsers: 2,
        scores: {},
        currentTurn: "",
      };
    }

    const room = activeRooms[roomId];
    if (!room.users.includes(userId)) {
      room.users.push(userId);
      socket.join(roomId); // Ensure the socket joins the room
      socket.emit("joinRoomSuccess", `Joined room ${roomId}`); // Emit success message
    }

    console.log("Updated activeRooms:", activeRooms); // Check if rooms are added correctly

    // Emit updated active rooms to all clients
    io.emit("activeRooms", Object.values(activeRooms));

    // Check if the room is full
    // Notify clients to start the game when the room is full
    if (room.users.length === room.maxUsers) {
      console.log(
        `Room ${roomId} is full. Notifying clients to start the game.`
      );
      // Retrieve wallet addresses for both users in the room
      const user1Wallet = userWallets[room.users[0]];
      const user2Wallet = userWallets[room.users[1]];
      io.to(roomId).emit("DirectGenerateTiles", {
        wallets: [user1Wallet, user2Wallet],
      });
    }
  });
  // Server-side: Notify clients to start the game and pick a random starting user
  socket.on("confirmTiles", (roomId: string, userId: string, tiles: Tile[]) => {
    if (!confirmedTiles[roomId]) {
      confirmedTiles[roomId] = {};
    }

    confirmedTiles[roomId][userId] = tiles;
    console.log(`User ${userId} in room ${roomId} confirmed tiles.`);

    // Check if both users have confirmed their tiles
    const room = activeRooms[roomId];
    if (room && room.users.length === room.maxUsers) {
      const user1 = room.users[0];
      const user2 = room.users[1];

      if (confirmedTiles[roomId][user1] && confirmedTiles[roomId][user2]) {
        // Select a random user to start the game
        const startingUser = Math.random() < 0.5 ? user1 : user2;
        room.currentTurn = startingUser;

        // Notify users to start the game and inform who starts
        io.to(roomId).emit("startGame", { startingUser });

        console.log(
          `Room ${roomId} is starting the game. Starting user: ${startingUser}`
        );
      }
    }
  });

  // Server-side: Add an event to handle tile requests
  // Assuming `confirmedTiles` has the structure: { roomId: { userId: tiles[] } }
  // `activeRooms` has the structure: { roomId: { users: [userId1, userId2], currentTurn: userId } }

  socket.on("requestTiles", (roomId: string, userId: string) => {
    const room = activeRooms[roomId];
    if (room) {
      // Randomly select a starting user if not already set
      if (!room.currentTurn) {
        const startingUserIndex = Math.floor(Math.random() * room.users.length);
        room.currentTurn = room.users[startingUserIndex];
      }

      // Get the opponent's userId
      const opponentId = room.users.find((id) => id !== userId);

      if (opponentId) {
        const opponentTiles = confirmedTiles[roomId]?.[opponentId];

        if (opponentTiles) {
          // Send the opponent's tiles to the user
          socket.emit("receiveTiles", {
            tiles: opponentTiles,
            currentTurn: room.currentTurn,
          });
          console.log(
            `Tiles sent to user ${userId} from opponent ${opponentId} in room ${roomId}`
          );
        } else {
          console.log(
            `No tiles found for opponent ${opponentId} in room ${roomId}`
          );
        }
      } else {
        console.log(`No opponent found for user ${userId} in room ${roomId}`);
      }
    } else {
      console.log(`Room ${roomId} not found`);
    }
  });

  // Listen for the moveMade event from a client
  socket.on("moveMade", ({ roomId, userId, tileId }) => {
    const room = activeRooms[roomId];

    if (room) {
      console.log(
        `User ${userId} in room ${roomId} made a move on tile ${tileId}`
      );

      // Change the turn to the next player after a move
      const nextPlayerIndex =
        (room.users.indexOf(userId) + 1) % room.users.length;
      room.currentTurn = room.users[nextPlayerIndex];

      // Emit the updated turn to all users in the room
      io.to(roomId).emit("updateTurn", { currentTurn: room.currentTurn });

      console.log(`Turn updated. Next turn: ${room.currentTurn}`);
    } else {
      console.log(`Room ${roomId} not found or invalid move.`);
    }
  });

  socket.on("updateScore", ({ roomId, userId }) => {
    const room = activeRooms[roomId];
    if (room && room.scores[userId] !== undefined) {
      // Update the user's score
      room.scores[userId] += 1;

      // Emit the updated scores to all users in the room
      io.to(roomId).emit("updateOpponentScore", {
        userId,
        newScore: room.scores[userId],
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

console.log("Socket.IO server running on port 8585");
