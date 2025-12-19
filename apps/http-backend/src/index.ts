import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import {
  CreateRoomSchema,
  CreateUserSchema,
  SigninSchema,
} from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import { authMiddleware } from "./middleware";

const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {
  // Handle user signup logic here
  const parsedData = CreateUserSchema.safeParse(req.body);
  if (!parsedData.success) {
    console.log(parsedData.error);
    return res.status(400).send({ message: "Invalid request data" });
  }

  try {
    const user = await prismaClient.user.create({
      data: {
        email: parsedData.data.username,
        //  NOTE: HASH PASSWORD IN PRODUCTION
        password: parsedData.data.password,
        name: parsedData.data.name,
      },
    });

    res
      .status(201)
      .send({ message: "User signed up successfully", userId: user.id });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }

  res.status(201).send({ message: "User signed up successfully" });
});

app.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).send({ message: "Invalid request data" });
  }

  const user = await prismaClient.user.findFirst({
    where: {
      email: parsedData.data.username,
      password: parsedData.data.password, // NOTE: HASH PASSWORD IN PRODUCTION
    },
  });

  if (!user) {
    return res.status(401).send({ message: "Invalid username or password" });
  }

  const token = jwt.sign(
    {
      userId: user?.id,
    },
    JWT_SECRET
  );

  res.json({ token });
});

app.post("/room", authMiddleware, async (req, res) => {
  const parsedData = CreateRoomSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).send({ message: "Invalid request data" });
  }
  const userId = req.userId;
  try {
    const room = await prismaClient.room.create({
      data: {
        slug: parsedData.data.name,
        adminId: userId!,
      },
    });
    res
      .status(201)
      .json({ roomId: room.id, message: "Room created successfully" });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.get( "/chats/:roomId",async (req, res) => {
  const roomId = Number(req.params.roomId);
  const messages = await prismaClient.chat.findMany({
    where:{
      roomId: roomId
    },
    orderBy:{ id: 'desc' },
    take : 50
  })
  res.json({ message: "Chats fetched successfully",
    messages:  messages
  })
});

app.listen(3001, () => {
  console.log("HTTP backend is running on http://localhost:3001");
});
