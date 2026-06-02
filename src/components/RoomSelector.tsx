import React, { useState } from "react";
import { Network, Edit3, Check, RefreshCw } from "lucide-react";

interface RoomSelectorProps {
  roomId: string;
  defaultRoomCode: string;
  userName: string;
  onUpdateRoom: (newRoomId: string) => void;
  onUpdateUserName: (newUserName: string) => void;
  onResetToDefault: () => void;
}

export default function RoomSelector({
  roomId,
  defaultRoomCode,
  userName,
  onUpdateRoom,
  onUpdateUserName,
  onResetToDefault,
}: RoomSelectorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [isJoinInputOpen, setIsJoinInputOpen] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState("");

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleJoinCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRoomInput.trim()) {
      onUpdateRoom(customRoomInput.trim().toUpperCase());
      setIsJoinInputOpen(false);
      setCustomRoomInput("");
    }
  };

  const isUsingDefault = roomId === defaultRoomCode;

  return (
    <div className="glass-panel rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Network Room Indicator */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 tracking-wider uppercase font-display">
          <Network className="w-4 h-4 text-slate-400" />
          <span>Active WiFi Sharing Room</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-display tracking-tight text-white">
              {roomId}
            </span>
            {isUsingDefault ? (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans font-semibold uppercase tracking-wider">
                WiFi Auto
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans font-semibold uppercase tracking-wider">
                Custom Room
              </span>
            )}
          </div>

          {!isUsingDefault && (
            <button
              onClick={onResetToDefault}
              className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Reset to automatically detected WiFi room"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Auto</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="pt-4 border-t border-white/5">
        <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase font-display mb-2">
          Your Device Identifier
        </label>
        
        {isEditingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-100 font-sans"
              maxLength={20}
              placeholder="e.g. Phone, iPad"
              id="device-name-input"
            />
            <button
              onClick={handleSaveName}
              className="p-2 text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer"
              title="Save nickname"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 px-3.5 bg-white/5 border border-white/5 rounded-xl group hover:border-white/10 transition-all">
            <span className="font-sans text-xs text-slate-200 font-medium">
              {userName}
            </span>
            <button
              onClick={() => {
                setTempName(userName);
                setIsEditingName(true);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              title="Edit identifier"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Manual Room Joining */}
      <div className="pt-4 border-t border-white/5">
        {!isJoinInputOpen ? (
          <button
            onClick={() => setIsJoinInputOpen(true)}
            className="w-full py-2.5 text-xs font-sans font-medium text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            Join / Create Another Room Code
          </button>
        ) : (
          <form onSubmit={handleJoinCustomRoom} className="space-y-2.5">
            <input
              type="text"
              value={customRoomInput}
              onChange={(e) => setCustomRoomInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-100 font-sans font-medium uppercase"
              placeholder="ENTER ROOM CODE (e.g. HOME-WIFI)"
              maxLength={15}
              id="custom-room-code"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 text-[11px] font-sans font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setIsJoinInputOpen(false)}
                className="flex-1 py-2 text-[11px] font-sans font-medium text-slate-400 hover:text-white border border-white/10 rounded-xl bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
