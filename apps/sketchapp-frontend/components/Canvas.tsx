"use client";
import { initDraw } from "@/app/draw";
import { useEffect, useRef } from "react";

export default function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && socket) {
      initDraw(canvasRef.current, roomId, socket);
    }
  }, [socket, roomId]);
  return <canvas ref={canvasRef} width={2000} height={1000}></canvas>;
}
