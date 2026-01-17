import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Mail, Check, AlertCircle } from "lucide-react";

interface EmailExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string, options: ExportOptions) => Promise<void>;
  getPreview: (options: ExportOptions) => Promise<string | null>;
  theme: string;
}

export interface ExportOptions {
  withBackground: boolean;
  darkMode: boolean;
  scale: number;
  includeRaw: boolean;
}

export function EmailExportModal({ isOpen, onClose, onSend, getPreview, theme }: EmailExportModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [withBackground, setWithBackground] = useState(true);
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [scale, setScale] = useState(2);
  const [includeRaw, setIncludeRaw] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Sync dark mode default with current theme when opening
  useEffect(() => {
    if (isOpen) {
      setDarkMode(theme === "dark");
    }
  }, [isOpen, theme]);

  // Update preview when options change
  useEffect(() => {
    if (!isOpen) return;

    const updatePreview = async () => {
      const url = await getPreview({
        withBackground,
        darkMode,
        scale,
        includeRaw
      });
      setPreviewUrl(url);
    };

    const timer = setTimeout(updatePreview, 100); // Debounce slightly
    return () => clearTimeout(timer);
  }, [isOpen, withBackground, darkMode, scale, getPreview]); // includeRaw doesn't affect preview image

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await onSend(email, {
        withBackground,
        darkMode,
        scale,
        includeRaw
      });
      onClose();
      setEmail("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export to Email">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Preview Area */}
        <div className="relative w-full aspect-video bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden border border-border/50">
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain shadow-md"
              style={{ 
                 // If transparent background, show user visually by checking pattern
                 backgroundImage: !withBackground ? "linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)" : "none",
                 backgroundPosition: "0 0, 10px 10px",
                 backgroundSize: "20px 20px"
              }}
            />
          ) : (
            <div className="text-muted-foreground text-sm">Loading preview...</div>
          )}
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          


          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Dark mode</span>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 flex items-center rounded-full transition-colors ${
                darkMode ? "bg-blue-600" : "bg-muted"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform`}
                style={{ transform: darkMode ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Include Raw File (.excalidraw)</span>
            <button
              type="button"
              onClick={() => setIncludeRaw(!includeRaw)}
              className={`w-11 h-6 flex items-center rounded-full transition-colors ${
                includeRaw ? "bg-blue-600" : "bg-muted"
              }`}
            >
              <div
                 className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform`}
                 style={{ transform: includeRaw ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>



        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
             Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
           <button 
             type="button" 
             onClick={onClose} 
             className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
           >
             Cancel
           </button>
           <button
             type="submit"
             disabled={loading}
             className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
           >
             {loading ? "Sending..." : <> <Mail className="w-4 h-4" /> Send Export </>}
           </button>
        </div>
      </form>
    </Modal>
  );
}
