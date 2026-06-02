import { Peer } from "../types";
import { Laptop, Monitor, Smartphone, HelpCircle } from "lucide-react";

interface PeerListProps {
  peers: Peer[];
  currentClientId: string;
}

export default function PeerList({ peers, currentClientId }: PeerListProps) {
  const getDeviceIcon = (userName: string) => {
    const LowerName = userName.toLowerCase();
    if (LowerName.includes("mac") || LowerName.includes("laptop") || LowerName.includes("book") || LowerName.includes("pro")) {
      return <Laptop className="w-4 h-4 text-slate-300" />;
    }
    if (LowerName.includes("phone") || LowerName.includes("iphone") || LowerName.includes("android") || LowerName.includes("pixel") || LowerName.includes("galaxy") || LowerName.includes("mobile")) {
      return <Smartphone className="w-4 h-4 text-slate-300" />;
    }
    if (LowerName.includes("pc") || LowerName.includes("desktop") || LowerName.includes("windows") || LowerName.includes("linux")) {
      return <Monitor className="w-4 h-4 text-slate-300" />;
    }
    return <HelpCircle className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="glass-panel rounded-3xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-3.5">
        <h4 className="font-display font-semibold text-slate-200 text-sm">
          Active Devices ({peers.length})
        </h4>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {peers.length === 0 ? (
        <p className="text-xs text-slate-400 font-sans">No other devices connected right now.</p>
      ) : (
        <div className="space-y-2">
          {peers.map((peer, i) => {
            const isSelf = peer.id === currentClientId;
            return (
              <div
                key={peer.id || i}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isSelf
                    ? "bg-white/10 border-white/10 shadow-inner"
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-white/5">
                    {getDeviceIcon(peer.userName)}
                  </div>
                  <span className="font-sans text-slate-200 text-xs font-medium truncate" title={peer.userName}>
                    {peer.userName}
                  </span>
                </div>
                {isSelf && (
                  <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md font-sans border border-white/5">
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-500 font-sans leading-normal">
        All devices sharing the same Wi-Fi/Internet room code will instantly discover each other.
      </p>
    </div>
  );
}
