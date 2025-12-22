"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { roomAPI } from "@/lib/api";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";

export default function CanvasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/signin");
      return;
    }

    setUser(JSON.parse(userStr));
    loadRooms();
  }, [router]);

  const loadRooms = async () => {
    try {
      const response = await roomAPI.getAll();
      setRooms(response.rooms || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    setCreating(true);
    try {
      const response = await roomAPI.create({ name: newRoomName });
      router.push(`/draw?room=${response.room.slug}`);
    } catch (error: any) {
      console.error("Error creating room:", error);
      alert(error.response?.data?.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Excalidraw Clone</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.name}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Room Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onKeyPress={(e) => e.key === "Enter" && createRoom()}
            />
            <Button
              onClick={createRoom}
              disabled={creating || !newRoomName.trim()}
            >
              {creating ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </Card>

        {/* Rooms List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Rooms</h2>
          {rooms.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No rooms yet. Create one to get started!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/draw?room=${room.slug}`)}
                >
                  <h3 className="font-semibold text-lg mb-2">
                    {room.name || room.slug}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {room._count?.members || 0} member(s)
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
