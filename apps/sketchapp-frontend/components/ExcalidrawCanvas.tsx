"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { roomAPI, canvasAPI } from "@/lib/api";
import { Share2, Users, Save } from "lucide-react";
import { ShareModal } from "./ShareModal";

interface ExcalidrawCanvasProps {
  roomSlug: string;
}

export function ExcalidrawCanvas({ roomSlug }: ExcalidrawCanvasProps) {
  const [room, setRoom] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const excalidrawRef = useRef<any>(null); // Use ref for immediate access
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const isRemoteUpdate = useRef<boolean>(false);
  const pendingUpdates = useRef<Array<{ elements: any[], appState: any }>>([]);

  // Get token and user from localStorage
  const token = typeof window !== "undefined" 
    ? localStorage.getItem("accessToken") || "" 
    : "";
  
  const user = typeof window !== "undefined"
    ? (() => {
        const userStr = localStorage.getItem("user");
        const guestName = localStorage.getItem("guestName");
        if (userStr) return JSON.parse(userStr);
        if (guestName) return { name: guestName, isGuest: true };
        return null;
      })()
    : null;

  // Setup WebSocket for real-time collaboration
  const {
    isConnected,
    activeUsers,
    sendCanvasUpdate,
  } = useWebSocket({
    roomId: room?.id?.toString() || "",
    token,
    onCanvasUpdate: useCallback((elements: any[], appState: any) => {
      console.log('📥 Received canvas update:', elements.length, 'elements');
      
      // Use ref for immediate access
      const api = excalidrawRef.current;
      
      if (!api) {
        console.warn('⚠️ excalidrawAPI not available yet (ref is null), queuing update');
        pendingUpdates.current.push({ elements, appState });
        return;
      }
      
      const { collaborators, ...safeAppState } = appState || {};
      console.log('🎨 Updating Excalidraw scene...');
      
      isRemoteUpdate.current = true;
      
      try {
        if (elements.length > 0) {
          const localElements = api.getSceneElements();
          const localElement = localElements.find((el: any) => el.id === elements[0].id);
          console.log('🔍 Update check:', {
            incomingId: elements[0].id,
            incomingVersion: elements[0].version,
            localVersion: localElement?.version,
            needsUpdate: !localElement || elements[0].version > localElement.version
          });
        }

        // Update scene
        // REMOVED collaborators to fix crash
        api.updateScene({
          elements,
          appState: {
            ...safeAppState,
            scrollX: api.getAppState().scrollX,
            scrollY: api.getAppState().scrollY,
            zoom: api.getAppState().zoom,
          },
          commitToHistory: false,
        });
        
        // Force a re-render
        setLastSaved(new Date(0)); 
        
        console.log('✅ Scene updated successfully');
      } catch (error) {
        console.error('❌ Error updating scene:', error);
      } finally {
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 100);
      }
    }, []), // No dependencies needed since we use ref
  });

  // Apply pending updates when API becomes available
  useEffect(() => {
    console.log('🔄 useEffect triggered - excalidrawAPI:', excalidrawAPI ? 'AVAILABLE' : 'NULL', 'pending:', pendingUpdates.current.length);
    
    if (excalidrawAPI && pendingUpdates.current.length > 0) {
      console.log('🔄 Applying', pendingUpdates.current.length, 'pending updates');
      const updates = [...pendingUpdates.current];
      pendingUpdates.current = [];
      
      // Apply the last update only
      if (updates.length > 0) {
        const lastUpdate = updates[updates.length - 1];
        const { collaborators, ...safeAppState } = lastUpdate.appState || {};
        
        isRemoteUpdate.current = true;
        try {
          excalidrawAPI.updateScene({
            elements: lastUpdate.elements,
            appState: safeAppState,
          });
          console.log('✅ Pending updates applied successfully');
        } catch (error) {
          console.error('❌ Error applying pending updates:', error);
        } finally {
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        }
      }
    }
  }, [excalidrawAPI]);

  // Load room and canvas data
  useEffect(() => {
    async function loadRoom() {
      try {
        const roomData = await roomAPI.getBySlug(roomSlug);
        setRoom(roomData.room);

        if (roomData.room?.id) {
          try {
            const canvasData = await canvasAPI.get(roomData.room.id);
            if (canvasData.canvas?.data) {
              console.log('📄 Loaded initial canvas data:', canvasData.canvas.data);
              setInitialData(canvasData.canvas.data);
            }
          } catch (err) {
            console.log("No canvas data yet, starting fresh");
          }
        }
      } catch (error) {
        console.error("Error loading room:", error);
      } finally {
        setLoading(false);
      }
    }

    if (roomSlug) {
      loadRoom();
    }
  }, [roomSlug]);

  // Handle canvas changes
  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      if (isRemoteUpdate.current) {
        console.log('⏭️ Skipping onChange (remote update)');
        return;
      }

      const { collaborators, ...safeAppState } = appState || {};

      if (isConnected && room?.id) {
        console.log('📤 Sending canvas update');
        sendCanvasUpdate(elements as any[], safeAppState);
      }
    },
    [isConnected, room, sendCanvasUpdate]
  );

  // Manual save
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI || !room?.id) return;

    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const { collaborators, ...safeAppState } = appState || {};

    setSaving(true);
    try {
      await canvasAPI.save(room.id, elements, safeAppState);
      setLastSaved(new Date());
      excalidrawAPI.setToast({ message: "Canvas saved!" });
    } catch (error) {
      console.error("Error saving canvas:", error);
      excalidrawAPI.setToast({ message: "Error saving canvas" });
    } finally {
      setSaving(false);
    }
  }, [excalidrawAPI, room]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Excalidraw
        excalidrawAPI={(api) => {
          console.log('🎯 Excalidraw API callback fired!', api ? 'API available' : 'API is null');
          excalidrawRef.current = api;
          setExcalidrawAPI(api);
          // Expose to window for debugging
          if (typeof window !== 'undefined') {
            (window as any).excalidrawAPI = api;
            console.log('✅ API exposed to window.excalidrawAPI');
          }
        }}
        initialData={initialData}
        onChange={handleChange}
        viewModeEnabled={false}
        name={user?.name || "Guest"}
        renderTopRightUI={() => (
          <div className="flex items-center gap-2 mr-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm text-xs border">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-700">
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm text-xs border">
              <Users className="w-3 h-3 text-gray-600" />
              <span className="text-gray-700">
                {activeUsers.length > 0 ? activeUsers.length : 1}
              </span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors"
              title="Share room"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        )}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomSlug={roomSlug}
        roomId={room?.id || 0}
      />
    </div>
  );
}
