import { io, type Socket } from "socket.io-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

let socket: Socket | null = null
let currentToken: string | null = null

export const getSocket = (token: string | null) => {
  if (!token) {
    return null
  }

  if (socket && currentToken === token) {
    return socket
  }

  if (socket) {
    socket.disconnect()
    socket = null
  }

  currentToken = token
  socket = io(API_BASE_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
  })

  return socket
}

export const disconnectSocket = () => {
  if (!socket) {
    return
  }

  socket.disconnect()
  socket = null
  currentToken = null
}
