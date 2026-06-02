export interface FileMetadata {
  id: string;
  roomId: string;
  originalName: string;
  uniqueName: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  expiresAt: number;
  sender: string;
}

export interface Peer {
  id: string;
  userName: string;
}

export interface RoomState {
  files: FileMetadata[];
  peers: Peer[];
}
