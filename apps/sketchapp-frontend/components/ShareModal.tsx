"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Mail, Users } from "lucide-react";
import { roomAPI } from "@/lib/api";
import { toast } from "sonner";

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
  const [isPublic, setIsPublic] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/draw?room=${roomSlug}`;

  useEffect(() => {
    if (isOpen) {
      loadRoomData();
    }
  }, [isOpen, roomId]);

  const loadRoomData = async () => {
    try {
      // Load members
      const membersResponse = await roomAPI.getMembers(roomId);
      setMembers(membersResponse.members || []);
      
      // Load room details to get isPublic status
      const roomResponse = await roomAPI.getBySlug(roomSlug);
      setIsPublic(roomResponse.room?.isPublic || false);
    } catch (err) {
      console.error("Error loading room data:", err);
      toast.error("Failed to load room data");
    }
  };

  const loadMembers = async () => {
    try {
      const response = await roomAPI.getMembers(roomId);
      setMembers(response.members || []);
    } catch (err) {
      console.error("Error loading members:", err);
      toast.error("Failed to load members");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async () => {
    setUpdatingAccess(true);
    try {
      await roomAPI.update(roomId, { isPublic: !isPublic });
      setIsPublic(!isPublic);
      toast.success(`Room is now ${!isPublic ? 'public' : 'private'}`);
    } catch (err) {
      console.error("Error updating room access:", err);
      toast.error("Failed to update room access");
    } finally {
      setUpdatingAccess(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await roomAPI.addMember(roomId, email, "editor");
      setEmail("");
      toast.success("User invited successfully");
      await loadRoomData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to invite user";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // Optimistic update or just wait? Let's just do it.
    // Ideally we'd show a custom confirmation modal, but for now we'll skip the native confirm
    // as per user request to avoid "alert pop up". 
    // We could add a "Undo" toast if we wanted to be fancy.
    
    try {
      await roomAPI.removeMember(roomId, userId);
      toast.success("Member removed");
      await loadRoomData();
    } catch (err: any) {
      console.error("Error removing member:", err);
      const errorMessage = err.response?.data?.message || "Failed to remove member";
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Share Room</h2>
              <p className="text-sm text-muted-foreground">Invite others to collaborate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
          {/* Public/Private Access Toggle */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {isPublic ? "🌍 Public Access" : "🔒 Private Access"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPublic 
                    ? "Anyone with the link can access this room" 
                    : "Only invited members can access this room"}
                </p>
              </div>
              <button
                onClick={handleTogglePublic}
                disabled={updatingAccess}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card disabled:opacity-50 ${
                  isPublic ? 'bg-green-600' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
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
            <p className="mt-2 text-xs text-muted-foreground">
              {isPublic 
                ? "Anyone with this link can view and edit this canvas" 
                : "Only members added below can access this room"}
            </p>
          </div>

          {/* Invite by Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Invite by Email
            </label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">{loading ? "Inviting..." : "Invite"}</span>
              </button>
            </form>
            {error && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-xs text-destructive font-medium">{error}</p>
                {error.includes("not found") && (
                  <p className="mt-1 text-xs text-destructive/80">
                    💡 Tip: The user must create an account first. Share the link above instead!
                  </p>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              ⚠️ <strong>Note:</strong> User must have an account. Or just share the link above for instant access!
            </p>
          </div>

          {/* Members List */}
          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Members ({members.length})
              </label>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold font-sketch">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground font-sans">
                          {member.user.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground capitalize font-mono">
                        {member.role}
                      </div>
                      {member.role !== 'admin' && (
                         <button
                           onClick={() => handleRemoveMember(member.user.id)}
                           className="p-1 text-muted-foreground hover:text-destructive transition-all"
                           title="Remove member"
                         >
                           <X className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
