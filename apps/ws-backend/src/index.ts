import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket;
  rooms: Set<string>;
  userId: string;
  userName: string;
  cursor?: { x: number; y: number };
  color: string;
}

interface WSMessage {
  type: string;
  roomId?: string;
  [key: string]: any;
}

const users = new Map<string, User>();
const rooms = new Map<string, Set<string>>(); // roomId -> Set of userIds

// Generate random color for user cursor
function generateUserColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"
  ];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

function checkUser(token: string): { userId: string; userName: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") return null;

    if (!decoded || !decoded.userId) {
      return null;
    }

    return {
      userId: decoded.userId,
      userName: decoded.email || "Anonymous",
    };
  } catch (e) {
    return null;
  }
}

// Generate guest user ID
function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function broadcastToRoom(roomId: string, message: WSMessage, excludeUserId?: string) {
  const roomUsers = rooms.get(roomId);
  if (!roomUsers) return;

  let sentCount = 0;
  roomUsers.forEach((userId) => {
    if (userId === excludeUserId) return;
    
    const user = users.get(userId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
      sentCount++;
    }
  });

  console.log(`Broadcast to room ${roomId}: sent to ${sentCount} users`);
}

function getRoomPresence(roomId: string) {
  const roomUsers = rooms.get(roomId);
  if (!roomUsers) return [];

  return Array.from(roomUsers).map((userId) => {
    const user = users.get(userId);
    return {
      userId,
      userName: user?.userName,
      cursor: user?.cursor,
      color: user?.color,
    };
  });
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) {
    ws.close();
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const guestName = queryParams.get("guestName") || "";
  
  let userId: string;
  let userName: string;
  
  // Try to authenticate with token first
  const userInfo = token ? checkUser(token) : null;
  
  if (userInfo) {
    // Authenticated user
    userId = userInfo.userId;
    userName = userInfo.userName;
  } else if (guestName) {
    // Guest user
    userId = generateGuestId();
    userName = guestName;
  } else {
    // No auth and no guest name - reject
    ws.close();
    return;
  }
  const userColor = generateUserColor();

  // Create or update user
  const user: User = {
    userId,
    userName,
    ws,
    rooms: new Set(),
    color: userColor,
  };
  users.set(userId, user);

  console.log(`User ${userName} (${userId}) connected`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      userId,
      userName,
      color: userColor,
    })
  );

  ws.on("message", async function message(data) {
    let parsedData: WSMessage;

    try {
      parsedData = JSON.parse(data.toString());
    } catch (error) {
      console.error("Invalid JSON received:", data.toString());
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
      return;
    }

    console.log(`Received from ${userName}:`, parsedData.type);

    try {
      switch (parsedData.type) {
        case "join_room": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          // Add user to room
          user.rooms.add(roomId);
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(userId);

          // Notify others in the room
          broadcastToRoom(
            roomId,
            {
              type: "user_joined",
              userId,
              userName,
              color: userColor,
            },
            userId
          );

          // Send current room presence to the joining user
          const presence = getRoomPresence(roomId);
          ws.send(
            JSON.stringify({
              type: "room_presence",
              roomId,
              users: presence,
            })
          );

          console.log(`User ${userName} joined room ${roomId}`);
          break;
        }

        case "leave_room": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          user.rooms.delete(roomId);
          rooms.get(roomId)?.delete(userId);

          // Notify others
          broadcastToRoom(roomId, {
            type: "user_left",
            userId,
            userName,
          });

          console.log(`User ${userName} left room ${roomId}`);
          break;
        }

        case "cursor_move": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          user.cursor = { x: parsedData.x, y: parsedData.y };

          // Broadcast cursor position to room
          broadcastToRoom(
            roomId,
            {
              type: "cursor_update",
              userId,
              x: parsedData.x,
              y: parsedData.y,
              color: userColor,
            },
            userId
          );
          break;
        }

        case "canvas_update": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          // Broadcast canvas changes to all users in room
          broadcastToRoom(
            roomId,
            {
              type: "canvas_update",
              userId,
              elements: parsedData.elements,
              appState: parsedData.appState,
            },
            userId
          );
          break;
        }

        case "element_add": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          broadcastToRoom(
            roomId,
            {
              type: "element_add",
              userId,
              element: parsedData.element,
            },
            userId
          );
          break;
        }

        case "element_update": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          broadcastToRoom(
            roomId,
            {
              type: "element_update",
              userId,
              element: parsedData.element,
            },
            userId
          );
          break;
        }

        case "element_delete": {
          const roomId = parsedData.roomId;
          if (!roomId) break;

          broadcastToRoom(
            roomId,
            {
              type: "element_delete",
              userId,
              elementId: parsedData.elementId,
            },
            userId
          );
          break;
        }

        case "chat": {
          const roomId = parsedData.roomId;
          const message = parsedData.message;
          if (!roomId || !message) break;

          console.log("Chat message received for room:", roomId);

          // Save to database
          await prismaClient.chat.create({
            data: {
              roomId: Number(roomId),
              userId: userId,
              message: message,
            },
          });

          // Broadcast to room
          broadcastToRoom(roomId, {
            type: "chat",
            roomId,
            userId,
            userName,
            message,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "ping": {
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        }

        default:
          console.log("Unknown message type:", parsedData.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`User ${userName} (${userId}) disconnected`);

    // Remove user from all rooms
    user.rooms.forEach((roomId) => {
      rooms.get(roomId)?.delete(userId);
      
      // Notify others
      broadcastToRoom(roomId, {
        type: "user_left",
        userId,
        userName,
      });
    });

    // Remove user
    users.delete(userId);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for user ${userName}:`, error);
  });
});

// Heartbeat to keep connections alive
setInterval(() => {
  users.forEach((user) => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.ping();
    }
  });
}, 30000); // Every 30 seconds

console.log("WebSocket server is running on ws://localhost:8080");
