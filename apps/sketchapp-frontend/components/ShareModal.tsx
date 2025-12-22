"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Mail, Users } from "lucide-react";
import { roomAPI } from "@/lib/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSlug: string;
  roomId: number;
}

export function ShareModal({ isOpen, onClose, roomSlug, roomId }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/draw?room=${roomSlug}`;

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, roomId]);

  const loadMembers = async () => {
    try {
      const response = await roomAPI.getMembers(roomId);
      setMembers(response.members || []);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await roomAPI.addMember(roomId, email, "editor");
      setEmail("");
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Share Room</h2>
              <p className="text-sm text-gray-500">Invite others to collaborate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Anyone with this link can view and edit this canvas
            </p>
          </div>

          {/* Invite by Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite by Email
            </label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">{loading ? "Inviting..." : "Invite"}</span>
              </button>
            </form>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-medium">{error}</p>
                {error.includes("not found") && (
                  <p className="mt-1 text-xs text-red-600">
                    💡 Tip: The user must create an account first. Share the link above instead!
                  </p>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-600">
              ⚠️ <strong>Note:</strong> User must have an account. Or just share the link above for instant access!
            </p>
          </div>

          {/* Members List */}
          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Members ({members.length})
              </label>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {member.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
