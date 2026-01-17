"use client";

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { roomAPI, canvasAPI, emailAPI } from "@/lib/api";
import { Share2, Users, Save, Mail } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { EmailExportModal } from "./EmailExportModal";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

interface ExcalidrawCanvasProps {
  roomSlug: string;
}

export function ExcalidrawCanvas({ roomSlug }: ExcalidrawCanvasProps) {
  const { theme } = useTheme();
  const [room, setRoom] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const excalidrawRef = useRef<any>(null); // Use ref for immediate access
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const isRemoteUpdate = useRef<boolean>(false);
  const pendingUpdates = useRef<Array<{ elements: any[], appState: any }>>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());

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
    sendCursorPosition,
  } = useWebSocket({
    roomId: room?.id?.toString() || "",
    token,
    onCursorUpdate: useCallback((userId: string, x: number, y: number, color: string) => {
      // Update collaborator cursor position
      setCollaborators(prev => {
        const updated = new Map(prev);
        updated.set(userId, {
          pointer: { x, y },
          button: "up",
          username: userId, // Will be updated with actual name later
          userState: { color },
        });
        return updated;
      });
    }, []),
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

        // Only update elements, preserve local app state
        // This keeps tool selection, theme, zoom, scroll independent per user
        api.updateScene({
          elements,
          // Don't update appState - keeps each user's preferences independent
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

  // Update collaborator usernames when activeUsers changes
  useEffect(() => {
    if (activeUsers.length > 0) {
      setCollaborators(prev => {
        const updated = new Map(prev);
        activeUsers.forEach(user => {
          const existing = updated.get(user.id);
          if (existing) {
            updated.set(user.id, {
              ...existing,
              username: user.name,
            });
          }
        });
        return updated;
      });
    }
  }, [activeUsers]);

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
        toast.error("Failed to load room data");
      } finally {
        setLoading(false);
      }
    }

    if (roomSlug) {
      loadRoom();
    }
  }, [roomSlug]);

  // Sync Excalidraw theme with app theme
  useEffect(() => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: {
          theme: theme,
        },
      });
      console.log(`🎨 Canvas theme updated to: ${theme}`);
    }
  }, [theme, excalidrawAPI]);

  // Auto-save function with debouncing
  const autoSave = useCallback(async () => {
    if (!excalidrawAPI || !room?.id) return;

    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const { collaborators, ...safeAppState } = appState || {};

    setAutoSaving(true);
    try {
      await canvasAPI.save(room.id, elements, safeAppState);
      setLastSaved(new Date());
      console.log('✅ Auto-saved canvas');
    } catch (error) {
      console.error("Error auto-saving canvas:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [excalidrawAPI, room]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Handle canvas changes
  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      if (isRemoteUpdate.current) {
        console.log('⏭️ Skipping onChange (remote update)');
        return;
      }

      const { collaborators, ...safeAppState } = appState || {};

      if (isConnected && room?.id) {
        console.log('📤 Sending canvas update (elements only)');
        // Only send elements, not appState
        // This keeps tool selection, theme, selections independent per user
        
        // Send updates immediately (component re-render issue fixed via memoization)
        // We need to send every update to ensure smooth drawing and final state
        sendCanvasUpdate(elements as any[], {});
        
        // Trigger auto-save with debouncing
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        
        autoSaveTimerRef.current = setTimeout(() => {
          autoSave();
        }, 2000); // Auto-save 2 seconds after last change
      }
    },
    [isConnected, room, sendCanvasUpdate, autoSave]
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
      toast.success("Canvas saved successfully");
    } catch (error) {
      console.error("Error saving canvas:", error);
      toast.error("Failed to save canvas");
    } finally {
      setSaving(false);
    }
  }, [excalidrawAPI, room]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleExportToEmail = useCallback(async (email: string, options: any) => {
    if (!excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    const files = excalidrawAPI.getFiles();
    
    // Check if there's anything to export
    if (!elements || elements.length === 0) {
       toast.error("Canvas is empty");
       return;
    }

    const { withBackground, darkMode, scale, includeRaw } = options;
    const attachments = [];

    // 1. Generate Image (PNG)
    try {
        const blob = await exportToBlob({
          elements,
          files,
          appState: {
             ...excalidrawAPI.getAppState(),
             exportWithDarkMode: darkMode,
             exportBackground: withBackground,
             exportScale: scale,
          },
          mimeType: "image/png",
        });

        if (blob) {
            const base64data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
            });
            attachments.push({
                filename: `drawing-export.png`,
                content: base64data,
                contentType: 'image/png'
            });
        }
    } catch (e) {
        console.error("Failed to generate PNG", e);
        toast.error("Failed to generate image");
        return;
    }

    // 2. Generate Raw File (JSON) if requested
    if (includeRaw) {
        try {
            const rawData = JSON.stringify({
                type: "excalidraw",
                version: 2,
                source: "https://excalidraw.com",
                elements,
                appState: {
                  ...excalidrawAPI.getAppState(),
                  viewBackgroundColor: withBackground ? excalidrawAPI.getAppState().viewBackgroundColor : "#ffffff",
                },
                files,
            }, null, 2);
            
            // Encode as base64 for transport (backend expects base64 or string content)
            const rawBase64 = `data:application/json;base64,${btoa(unescape(encodeURIComponent(rawData)))}`;
            
            attachments.push({
                filename: `drawing-raw.excalidraw`,
                content: rawBase64,
                contentType: 'application/json'
            });
        } catch (e) {
            console.error("Failed to generate raw file", e);
        }
    }

    // Send
    try {
        await emailAPI.sendExport(email, attachments);
        toast.success("Export sent to your email!");
    } catch (error) {
        console.error("Export error:", error);
        toast.error("Failed to send export email");
    }
  }, [excalidrawAPI]);

  // Function to generate preview
  const getPreview = useCallback(async (options: any) => {
    if (!excalidrawAPI) return null;

    const elements = excalidrawAPI.getSceneElements();
    const files = excalidrawAPI.getFiles();
    
    if (!elements || elements.length === 0) return null;

    const { withBackground, darkMode, scale } = options;

    try {
      const blob = await exportToBlob({
        elements,
        files,
        appState: {
           ...excalidrawAPI.getAppState(),
           exportWithDarkMode: darkMode,
           exportBackground: withBackground,
           exportScale: scale,
        },
        mimeType: "image/png",
      });

      if (!blob) return null;
      
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Preview generation failed", e);
      return null;
    }
  }, [excalidrawAPI]);

  const renderTopRightUI = useCallback(() => (
    <div className="flex items-center gap-2 mr-4">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg shadow-sm text-xs border border-border">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-card-foreground">
          {isConnected ? "Live" : "Offline"}
        </span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg shadow-sm text-xs border border-border">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-card-foreground">
          {activeUsers.length > 0 ? activeUsers.length : 1}
        </span>
      </div>

      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-1.5 bg-card border border-border rounded-lg hover:bg-accent text-card-foreground text-sm font-medium shadow-sm transition-colors"
        title="Share room"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      <button
        onClick={() => setShowEmailModal(true)}
        className="flex items-center gap-2 px-4 py-1.5 bg-card border border-border rounded-lg hover:bg-accent text-card-foreground text-sm font-medium shadow-sm transition-colors"
        title="Export to Email"
      >
        <Mail className="w-4 h-4" />
        <span>Export</span>
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
  ), [isConnected, activeUsers.length, handleShare, handleSave, saving]);

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
        theme={theme}
        name={user?.name || "Guest"}
        renderTopRightUI={renderTopRightUI}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomSlug={roomSlug}
        roomId={room?.id || 0}
      />
      
      <EmailExportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleExportToEmail}
        getPreview={getPreview}
        theme={theme}
      />
    </div>
  );
}
