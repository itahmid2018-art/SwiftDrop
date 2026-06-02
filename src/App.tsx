import { useState, useEffect, useRef } from "react";
import { FileMetadata, Peer } from "./types";
import RoomSelector from "./components/RoomSelector";
import PeerList from "./components/PeerList";
import UploadDropzone from "./components/UploadDropzone";
import FileList from "./components/FileList";
import { Wifi, Info, HelpCircle, ArrowRight, RefreshCw } from "lucide-react";

// Helper to determine a smart default device name based on UserAgent
function getDefaultDeviceName() {
  const ua = navigator.userAgent;
  let device = "Web Client";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android Device";
  else if (/Macintosh/i.test(ua)) device = "MacBook";
  else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Linux/i.test(ua)) device = "Linux PC";

  const num = Math.floor(100 + Math.random() * 900);
  return `${device} #${num}`;
}

export default function App() {
  // Client Identity state
  const [clientId] = useState(() => {
    const saved = localStorage.getItem("wifi_file_share_client_id");
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 12);
    localStorage.setItem("wifi_file_share_client_id", newId);
    return newId;
  });

  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem("wifi_file_share_user_name");
    if (saved) return saved;
    const name = getDefaultDeviceName();
    localStorage.setItem("wifi_file_share_user_name", name);
    return name;
  });

  const [defaultRoomCode, setDefaultRoomCode] = useState("WIFI-LOBBY");
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep a reference to the active EventSource
  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Fetch IP-based default room on startup
  useEffect(() => {
    async function fetchIpRoom() {
      try {
        const res = await fetch("/api/ip");
        const data = await res.json();
        if (data.defaultRoomCode) {
          setDefaultRoomCode(data.defaultRoomCode);
          // Only set if not already set by a manual update or bookmark
          if (!currentRoomId) {
            setCurrentRoomId(data.defaultRoomCode);
          }
        }
      } catch (err) {
        console.error("Failed to detect local network IP details:", err);
        if (!currentRoomId) {
          setCurrentRoomId("WIFI-LOBBY");
        }
      }
    }
    fetchIpRoom();
  }, []);

  // 2. Set up SSE stream whenever the room or username changes
  useEffect(() => {
    if (!currentRoomId) return;

    // Clean up previous event stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);

    const escUrl = `/api/rooms/${encodeURIComponent(
      currentRoomId
    )}/events?clientId=${encodeURIComponent(clientId)}&userName=${encodeURIComponent(
      userName
    )}`;

    const es = new EventSource(escUrl);
    eventSourceRef.current = es;

    es.addEventListener("init", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setFiles(data.files || []);
        setPeers(data.peers || []);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to parse init state:", err);
      }
    });

    es.addEventListener("files_updated", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setFiles(data.files || []);
        setPeers(data.peers || []);
      } catch (err) {
        console.error("Failed to parse files update:", err);
      }
    });

    es.addEventListener("peers_updated", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setPeers(data.peers || []);
      } catch (err) {
        console.error("Failed to parse peers update:", err);
      }
    });

    es.onerror = () => {
      console.warn("SSE disconnected. Reconnecting dynamically...");
    };

    return () => {
      es.close();
    };
  }, [currentRoomId, userName, clientId]);

  const handleUpdateUserName = (newName: string) => {
    setUserName(newName);
    localStorage.setItem("wifi_file_share_user_name", newName);
  };

  const handleUpdateRoom = (newRoomId: string) => {
    setCurrentRoomId(newRoomId.toUpperCase());
  };

  const handleResetToDefault = () => {
    setCurrentRoomId(defaultRoomCode);
  };

  const handleManualRefresh = async () => {
    if (!currentRoomId) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(currentRoomId)}/state`);
      const data = await res.json();
      setFiles(data.files || []);
      setPeers(data.peers || []);
    } catch (err) {
      console.error("Error refreshing room state:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(currentRoomId)}/files/${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        // SSE will also push updates, but we update locally for fast optimistic responsiveness
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 antialiased font-sans flex flex-col justify-between selection:bg-blue-600/40 selection:text-blue-200 relative overflow-hidden">

      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[110px] pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-lg relative">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-white/60 leading-none">
                SwiftDrop
              </h1>
              <p className="text-[10px] text-slate-400 font-sans mt-1 tracking-wider uppercase font-semibold">
                WiFi Share Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-sans font-medium">
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>IP Autodetect Room</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Left Column - Controls & Network Details */}
        <div className="md:col-span-4 space-y-5">

          {/* Quick Guide */}
          <div className="glass-panel border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex gap-3 relative z-10">
              <div className="p-2 h-fit text-blue-400 bg-white/5 border border-white/10 rounded-xl">
                <Info className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-100 text-sm">
                  Instant Sharing
                </h3>
                <p className="mt-1 text-xs text-slate-400 font-sans leading-relaxed">
                  Open this app on other smartphones & laptops on the same WiFi to instantly find each other.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 font-sans">
                  <span>Room is automatically matched as</span>
                  <span className="px-2 py-0.5 bg-white/10 border border-white/10 text-white rounded-md font-mono text-[10px] uppercase font-bold tracking-wider">
                    {currentRoomId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Room Selector & Identification */}
          <RoomSelector
            roomId={currentRoomId}
            defaultRoomCode={defaultRoomCode}
            userName={userName}
            onUpdateRoom={handleUpdateRoom}
            onUpdateUserName={handleUpdateUserName}
            onResetToDefault={handleResetToDefault}
          />

          {/* Active Devices */}
          <PeerList peers={peers} currentClientId={clientId} />

        </div>

        {/* Right Column - File Drag and Drop & Active Shared Files */}
        <div className="md:col-span-8 space-y-5">

          {/* File Dropzone */}
          {currentRoomId ? (
            <UploadDropzone
              roomId={currentRoomId}
              senderName={userName}
              onUploadSuccess={handleManualRefresh}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-slate-400 text-xs font-sans">
              Detecting wifi local network gateways...
            </div>
          )}

          {/* File Collection Header */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-medium text-slate-100 text-base uppercase tracking-wider text-xs md:text-sm">
                  Recent Activity
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Files survive in server memory cache and auto-expire after 60 minutes.
                </p>
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Active File List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="h-6 w-6 border-2 border-slate-700 border-t-blue-500 animate-spin rounded-full inline-block" />
                <p className="mt-3 text-xs text-slate-400 font-sans">Syncing local WiFi network cache...</p>
              </div>
            ) : (
              <FileList
                files={files}
                roomId={currentRoomId}
                onDeleteFile={handleDeleteFile}
              />
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 mt-12 bg-white/1">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
          <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest font-semibold flex items-center justify-center gap-4 flex-wrap">
            <span>Discovery: Active</span>
            <span>•</span>
            <span>Room ID: {currentRoomId}</span>
            <span>•</span>
            <span>Encryption: Sandboxed Node</span>
          </p>
          <p className="text-[10px] text-slate-600 font-sans">
            © 2026 SwiftDrop • Local Area File Transfer
          </p>
        </div>
      </footer>
    </div>
  );
}
