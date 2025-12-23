"use client";
import { useEffect, useState } from "react";
import Canvas from "./Canvas";
const WS_URL = process.env.WS_URL;
export default function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_URL}/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OGIxOGY3My0yZTBjLTQyMTUtOWZlOS05ZTg5YjVlYmNlNjgiLCJpYXQiOjE3NjYzMjI2MDd9.LdNfQH-bm6FsluKZfihOsD6NGSdV5NZ0OH1X8sU18qU`
    );

    ws.onopen = () => {
      const data = JSON.stringify({
        type: "join_room",
        roomId,
      });
      ws.send(data);

      setSocket(ws);
    };
  }, []);

  if (!socket) {
    return <div>Connecting to server...</div>;
  }
  return (
    <div>
      <Canvas roomId={roomId} socket={socket} />
    </div>
  );
}
