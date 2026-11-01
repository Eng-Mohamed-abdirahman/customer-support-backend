import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import User from "../models/User";

let io: Server | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      organizationId: string;
    };
    conversationId?: string;
    isAgent: boolean;
  };
}

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authentication Middleware
  io.use(async (socket: Socket, next) => {
    const authSocket = socket as AuthenticatedSocket;
    const token = authSocket.handshake.auth?.token || authSocket.handshake.headers.authorization?.split(" ")[1];
    const conversationId = authSocket.handshake.query?.conversationId || authSocket.handshake.auth?.conversationId;

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
          algorithms: ["HS256"],
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
        }) as { id?: string };

        if (!decoded.id) {
          return next(new Error("Authentication error: Invalid token claims"));
        }

        const user = await User.findById(decoded.id).select(
          "_id firstName lastName email role company"
        );

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        authSocket.data.user = {
          _id: String(user._id),
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email,
          role: user.role,
          organizationId: user.company ? String(user.company) : "",
        };
        authSocket.data.isAgent = true;
        return next();
      } catch (err) {
        return next(new Error("Authentication error: Token validation failed"));
      }
    } else if (conversationId) {
      // Allow customer widget connections using conversationId without JWT token
      authSocket.data.conversationId = String(conversationId);
      authSocket.data.isAgent = false;
      return next();
    } else {
      // Reject connection if neither JWT nor conversationId is provided
      return next(new Error("Authentication error: Token or Conversation ID required"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    if (authSocket.data.isAgent && authSocket.data.user?.organizationId) {
      const orgRoom = `org:${authSocket.data.user.organizationId}`;
      authSocket.join(orgRoom);
      console.log(`Agent ${authSocket.data.user.email} connected and joined room: ${orgRoom}`);
    } else if (authSocket.data.conversationId) {
      const convRoom = `conversation:${authSocket.data.conversationId}`;
      authSocket.join(convRoom);
      console.log(`Customer connected for conversation: ${authSocket.data.conversationId} and joined room: ${convRoom}`);
    }

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = (): Server => {
  if (!io) {
    throw new Error("Socket.io is not initialized yet!");
  }
  return io;
};

export const emitToOrganization = (organizationId: string, event: string, data: any): void => {
  if (io && organizationId) {
    io.to(`org:${organizationId}`).emit(event, data);
  }
};

export const emitToConversation = (conversationId: string, event: string, data: any): void => {
  if (io && conversationId) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};
