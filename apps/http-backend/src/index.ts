/// <reference path="./types/express.d.ts" />
import express, { Request, Response } from "express";
import { JWT_SECRET } from "@repo/backend-common/config";
import {
  CreateRoomSchema,
  CreateUserSchema,
  SigninSchema,
} from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import { authMiddleware, optionalAuthMiddleware } from "./middleware";
import cors from "cors";
import { AuthService } from "./services/auth.service";
import { FRONTEND_URL, PORT } from "./config";
const app = express();
app.use(express.json());

// CORS Configuration
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// ============ AUTH ROUTES ============

app.post("/api/auth/signup", async (req: Request, res: Response) => {
  const parsedData = CreateUserSchema.safeParse(req.body);
  if (!parsedData.success) {
    console.log(parsedData.error);
    return res.status(400).json({ 
      message: "Invalid request data",
      error: parsedData.error.format()
    });
  }

  try {
    // Check if user already exists
    const existingUser = await prismaClient.user.findUnique({
      where: { email: parsedData.data.username },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(parsedData.data.password);

    // Create user
    const user = await prismaClient.user.create({
      data: {
        email: parsedData.data.username,
        password: hashedPassword,
        name: parsedData.data.name,
      },
    });

    // Generate tokens
    const accessToken = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = AuthService.generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Create session
    await AuthService.createSession(user.id, refreshToken);

    res.status(201).json({
      message: "User signed up successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.post("/api/auth/signin", async (req: Request, res: Response) => {
  const parsedData = SigninSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({ 
      message: "Invalid request data",
      error: parsedData.error.format()
    });
  }

  try {
    const user = await prismaClient.user.findUnique({
      where: { email: parsedData.data.username },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isPasswordValid = await AuthService.comparePassword(
      parsedData.data.password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = AuthService.generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Create session
    await AuthService.createSession(user.id, refreshToken);

    res.json({
      message: "Signed in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        photo: user.photo,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    console.error("Signin error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.post("/api/auth/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await AuthService.deleteSession(token);
    }
    res.json({ message: "Logged out successfully" });
  } catch (e) {
    console.error("Logout error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.post("/api/auth/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    // Verify refresh token
    const payload = AuthService.verifyToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Validate session
    const isValid = await AuthService.validateSession(refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: "Session expired" });
    }

    // Generate new access token
    const accessToken = AuthService.generateAccessToken(payload);

    res.json({ accessToken });
  } catch (e) {
    console.error("Refresh token error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

// ============ USER ROUTES ============

app.get("/api/user/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (e) {
    console.error("Get user error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

// ============ ROOM ROUTES ============

app.post("/api/room", authMiddleware, async (req: Request, res: Response) => {
  const parsedData = CreateRoomSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ 
      message: "Invalid request data",
      error: parsedData.error.format()
    });
  }

  const userId = req.userId!;
  try {
    // Generate unique slug: name-based + random string
    const baseSlug = parsedData.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
    const slug = `${baseSlug}-${randomSuffix}`;

    // Double-check uniqueness (very unlikely to collide, but safe)
    const existing = await prismaClient.room.findUnique({ where: { slug } });
    if (existing) {
      // Extremely rare - add timestamp
      const timestampSlug = `${baseSlug}-${Date.now().toString(36)}`;
      return res.status(500).json({ 
        message: "Slug collision detected, please try again",
        suggestedSlug: timestampSlug 
      });
    }

    // Create room with canvas
    const room = await prismaClient.room.create({
      data: {
        slug,
        name: parsedData.data.name,
        adminId: userId,
        isPublic: false, // Default to private
        canvas: {
          create: {
            createdBy: userId,
            version: 1,
          },
        },
        members: {
          create: {
            userId: userId,
            role: "admin",
          },
        },
      },
      include: {
        canvas: true,
      },
    });

    res.status(201).json({
      message: "Room created successfully",
      room: {
        id: room.id,
        slug: room.slug,
        name: room.name,
        isPublic: room.isPublic,
        canvasId: room.canvas?.id,
      },
    });
  } catch (e) {
    console.error("Create room error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.get("/api/room/:slug", optionalAuthMiddleware, async (req: Request, res: Response) => {
  const slug = req.params.slug;
  
  try {
    const room = await prismaClient.room.findUnique({
      where: { slug },
      include: {
        canvas: {
          include: {
            elements: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photo: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Allow access if:
    // 1. User is authenticated and is a member/admin
    // 2. Room is public (anyone with link can access)
    // 3. User is not authenticated but has the link (allow anonymous access)
    const isMember = req.userId && room.members.some(m => m.userId === req.userId);
    const isAdmin = req.userId && room.adminId === req.userId;
    
    console.log("Room access check:", {
      slug,
      userId: req.userId,
      isMember,
      isAdmin,
      isPublic: room.isPublic,
      hasAuthHeader: !!req.headers.authorization
    });

    // Allow access if:
    // 1. Room is public (anyone with link can access)
    // 2. User is authenticated AND is a member/admin
    const isPublic = room.isPublic;
    const hasAccess = isPublic || isMember || isAdmin;

    if (!hasAccess) {
      console.log("Access denied for room:", slug, { isPublic, isMember, isAdmin });
      return res.status(403).json({ message: "Access denied. This room is private." });
    }

    res.json({ room });
  } catch (e) {
    console.error("Get room error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.get("/api/rooms", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rooms = await prismaClient.room.findMany({
      where: {
        OR: [
          { adminId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json({ rooms });
  } catch (e) {
    console.error("Get rooms error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

// ============ ROOM MEMBER ROUTES ============

// Add room member (invite user to room)
app.post("/api/room/:roomId/members", authMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  const { email, role = "editor" } = req.body;

  try {
    const room = await prismaClient.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.adminId !== req.userId) return res.status(403).json({ message: "Only admin can invite" });

    const userToAdd = await prismaClient.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ message: "User not found" });

    const member = await prismaClient.roomMember.create({
      data: { roomId, userId: userToAdd.id, role },
      include: { user: { select: { id: true, name: true, email: true, photo: true } } },
    });

    res.status(201).json({ message: "Member added", member });
  } catch (e) {
    console.error("Add member error:", e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Error" });
  }
});

// Get room members
app.get("/api/room/:roomId/members", authMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  try {
    const members = await prismaClient.roomMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true, email: true, photo: true } } },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ members });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : "Error" });
  }
});

// Remove room member
app.delete("/api/room/:roomId/members/:userId", authMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  const userIdToRemove = req.params.userId;
  const requesterId = req.userId!;

  try {
    const room = await prismaClient.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Only admin can remove others, or user can remove themselves (leave)
    if (room.adminId !== requesterId && requesterId !== userIdToRemove) {
      return res.status(403).json({ message: "Not authorized to remove this member" });
    }

    // Cannot remove the admin
    if (room.adminId === userIdToRemove) {
      return res.status(400).json({ message: "Cannot remove room admin" });
    }

    await prismaClient.roomMember.deleteMany({
      where: { roomId, userId: userIdToRemove },
    });

    res.json({ message: "Member removed" });
  } catch (e) {
    console.error("Remove member error:", e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Error" });
  }
});

// Update room
app.put("/api/room/:roomId", authMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  const { name, isPublic } = req.body;
  const requesterId = req.userId!;

  try {
    const room = await prismaClient.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.adminId !== requesterId) {
      return res.status(403).json({ message: "Only admin can update room" });
    }

    const updatedRoom = await prismaClient.room.update({
      where: { id: roomId },
      data: {
        name: name !== undefined ? name : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
      },
    });

    res.json({ message: "Room updated", room: updatedRoom });
  } catch (e) {
    console.error("Update room error:", e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Error" });
  }
});

// Delete room
app.delete("/api/room/:roomId", authMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  const requesterId = req.userId!;

  try {
    const room = await prismaClient.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.adminId !== requesterId) {
      return res.status(403).json({ message: "Only admin can delete room" });
    }

    // Delete room (cascading deletes should handle members and canvas if configured, 
    // but let's be safe and delete related data if needed, or rely on Prisma cascade)
    // Assuming Prisma schema has onDelete: Cascade for relations
    await prismaClient.room.delete({
      where: { id: roomId },
    });

    res.json({ message: "Room deleted" });
  } catch (e) {
    console.error("Delete room error:", e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Error" });
  }
});

// ============ CANVAS ROUTES ============

app.get("/api/canvas/:roomId", optionalAuthMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);

  try {
    const canvas = await prismaClient.canvas.findUnique({
      where: { roomId },
      include: {
        elements: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!canvas) {
      return res.status(404).json({ message: "Canvas not found" });
    }

    res.json({ canvas });
  } catch (e) {
    console.error("Get canvas error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

app.post("/api/canvas/:roomId/save", optionalAuthMiddleware, async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId!);
  const { elements, appState } = req.body;

  try {
    // Update canvas
    const canvas = await prismaClient.canvas.update({
      where: { roomId },
      data: {
        data: { elements, appState },
        version: { increment: 1 },
      },
    });

    res.json({
      message: "Canvas saved successfully",
      version: canvas.version,
    });
  } catch (e) {
    console.error("Save canvas error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

// ============ CHAT ROUTES ============

app.get("/api/chats/:roomId", authMiddleware, async (req: Request, res: Response) => {
  const roomId = Number(req.params.roomId);
  
  try {
    const messages = await prismaClient.chat.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ messages });
  } catch (e) {
    console.error("Get chats error:", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cleanup expired sessions periodically (every hour)
setInterval(() => {
  AuthService.cleanupExpiredSessions().catch(console.error);
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`HTTP backend is running on http://localhost:${PORT}`);
});
