"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { roomAPI } from "@/lib/api";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Pencil, LogOut, Plus, Trash2, Edit2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CanvasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");

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
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    setCreating(true);
    try {
      const response = await roomAPI.create({ name: newRoomName });
      toast.success("Room created successfully");
      router.push(`/draw?room=${response.room.slug}`);
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error(error.response?.data?.message || "Failed to create room");
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

  const openDeleteModal = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setSelectedRoom(room);
    setDeleteModalOpen(true);
  };

  const openRenameModal = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setSelectedRoom(room);
    setRenameValue(room.name || room.slug);
    setRenameModalOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    try {
      await roomAPI.delete(selectedRoom.id);
      toast.success("Room deleted successfully");
      setRooms(rooms.filter((r) => r.id !== selectedRoom.id));
      setDeleteModalOpen(false);
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error(error.response?.data?.message || "Failed to delete room");
    }
  };

  const handleRenameRoom = async () => {
    if (!selectedRoom || !renameValue.trim()) return;
    try {
      await roomAPI.update(selectedRoom.id, { name: renameValue });
      toast.success("Room renamed successfully");
      setRooms(rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: renameValue } : r)));
      setRenameModalOpen(false);
    } catch (error: any) {
      console.error("Error renaming room:", error);
      toast.error(error.response?.data?.message || "Failed to rename room");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg font-sketch animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-sketch text-foreground">Sketch Sync</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono hidden sm:inline-block">
              Welcome, <span className="text-foreground font-bold">{user?.name}</span>
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Room Section */}
        <Card className="p-6 mb-8 border-2 border-border/50 bg-card/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold font-sketch mb-4 flex items-center gap-2 text-foreground">
            <Plus className="h-5 w-5 text-primary" /> Create New Room
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition font-sans"
              onKeyPress={(e) => e.key === "Enter" && createRoom()}
            />
            <Button
              onClick={createRoom}
              disabled={creating || !newRoomName.trim()}
              className="font-sketch text-lg"
            >
              {creating ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </Card>

        {/* Rooms List */}
        <div>
          <h2 className="text-xl font-bold font-sketch mb-4 text-foreground">Your Rooms</h2>
          {rooms.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/50">
              <p className="font-sketch text-xl">No rooms yet. Create one to get started!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-border/50 hover:border-primary/50 group relative"
                  onClick={() => router.push(`/draw?room=${room.slug}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg font-sketch group-hover:text-primary transition-colors truncate flex-1 mr-2">
                      {room.name || room.slug}
                    </h3>
                    {/* Admin Actions */}
                    {room.adminId === user?.id && (
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openRenameModal(e, room)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Rename room"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(e, room)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete room"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {room._count?.members || 0} member(s)
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Room"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground font-sans">
            Are you sure you want to delete <span className="font-bold text-foreground">{selectedRoom?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRoom}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Room"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 font-mono">
              Room Name
            </label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-sans"
              placeholder="Enter new name"
              autoFocus
              onKeyPress={(e) => e.key === "Enter" && handleRenameRoom()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameRoom}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
