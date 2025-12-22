"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Excalidraw to avoid SSR issues
const ExcalidrawCanvas = dynamic(
  () => import("@/components/ExcalidrawCanvas").then((mod) => ({ default: mod.ExcalidrawCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg">Loading canvas...</div>
      </div>
    ),
  }
);

function DrawPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomSlug = searchParams.get("room");
  const [user, setUser] = useState<any>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem("user");
    const guestNameStored = localStorage.getItem("guestName");
    
    if (userStr) {
      // Logged in user
      setUser(JSON.parse(userStr));
    } else if (guestNameStored) {
      // Guest with name already set
      setUser({ name: guestNameStored, isGuest: true });
    } else {
      // New guest - show name prompt
      setShowNamePrompt(true);
    }
  }, [router]);

  const handleGuestJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    // Store guest name
    localStorage.setItem("guestName", guestName);
    setUser({ name: guestName, isGuest: true });
    setShowNamePrompt(false);
  };

  if (!roomSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Room Specified</h1>
          <p className="text-gray-600 mb-4">Please select a room from the dashboard</p>
          <button
            onClick={() => router.push("/canvas")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show name prompt for guests
  if (showNamePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Canvas Room</h1>
            <p className="text-gray-600">Enter your name to start collaborating</p>
          </div>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Join Room
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-600 mb-3">
              Already have an account?
            </p>
            <button
              onClick={() => router.push("/signin")}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Sign in instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(user?.isGuest ? "/" : "/canvas")}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            ← {user?.isGuest ? "Home" : "Back to Dashboard"}
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-base font-semibold">Room: {roomSlug}</h1>
        </div>
        <div className="flex items-center gap-4">
          {user?.isGuest && (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
              Guest
            </span>
          )}
          <span className="text-sm text-gray-600">
            {user?.name}
          </span>
        </div>
      </header>

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden">
        <ExcalidrawCanvas roomSlug={roomSlug} />
      </main>
    </div>
  );
}

export default function DrawPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <DrawPageContent />
    </Suspense>
  );
}
