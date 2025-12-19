import jwt, { JwtPayload } from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded == "string") return null;

    if (!decoded || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch (e) {
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) {
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", async function message(data) {
    let parsedData;
    try {
      parsedData = JSON.parse(data.toString());
    } catch (error) {
      console.error("Invalid JSON received:", data.toString());
      ws.send(JSON.stringify({ error: "Invalid JSON format" }));
      return;
    }

    if (parsedData.type === "join_room") {
      const user = users.find((u) => u.userId === userId);
      user?.rooms.push(parsedData.roomId);
    }

    if (parsedData.type === "leave_room") {
      const user = users.find((u) => u.userId === userId);
      if (user) {
        user.rooms = user.rooms.filter((r: string) => r !== parsedData.room);
      }
    }

    if (parsedData.type === "chat") {
      const room = parsedData.roomId;
      const message = parsedData.message;
      await prismaClient.chat.create({
        data: {
          roomId: Number(room),
          userId: userId,
          message: message, 
        },
      });
      users.forEach((user) => {
        if (user.rooms.includes(room)) {
          user.ws.send(
            JSON.stringify({
              type: "chat",
              roomId: room,
              message: message,
            })
          );
        }
      });
    }
  });
});
