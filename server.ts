import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

// __filename and __dirname are not used in this file

const app = express();
const PORT = 3000;

app.set("trust proxy", true);
app.use(express.json());

// Create uploads directory
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = Math.random().toString(36).substring(2, 10);
    cb(null, `${Date.now()}-${uniqueId}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // limit to 100 MB
});

// In-memory data store
interface FileMetadata {
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

let sharedFiles: FileMetadata[] = [];

// Real-time Event Clients
interface sseClient {
  id: string;
  roomId: string;
  userName: string;
  res: any;
}

let sseClients: sseClient[] = [];

// Clean up expired files (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const expired = sharedFiles.filter((f) => f.expiresAt <= now);

  if (expired.length > 0) {
    expired.forEach((file) => {
      const filePath = path.join(uploadDir, file.uniqueName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Error deleting expired file from storage:", err);
        }
      }
    });

    sharedFiles = sharedFiles.filter((f) => f.expiresAt > now);

    // Broadcast updates to affected rooms
    const affectedRooms = Array.from(new Set(expired.map((f) => f.roomId)));
    affectedRooms.forEach((rId) => {
      broadcastToRoom(rId, "files_updated", getRoomState(rId));
    });
  }
}, 30000); // Check every 30 seconds

// Helpers
function getRoomState(roomId: string) {
  const files = sharedFiles.filter((f) => f.roomId === roomId);
  const peers = sseClients
    .filter((c) => c.roomId === roomId)
    .map((c) => ({ id: c.id, userName: c.userName }));
  return { files, peers };
}

function broadcastToRoom(roomId: string, event: string, data: any) {
  const clients = sseClients.filter((c) => c.roomId === roomId);
  clients.forEach((client) => {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

// API Routes

// Helper to sanitize IP to dynamic Room IDs
app.get("/api/ip", (req, res) => {
  // Retrieve the client IP address
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";

  // Format the IP for better room identifier
  // e.g. ::1 or ::ffff:127.0.0.1 -> parse base IP
  let formattedId = clientIp.replace(/^.*:/, "");
  if (formattedId === "1") formattedId = "localhost";

  // For the room code, we can create a simple visually pleasing mnemonic or hash
  // Let's perform a simple sum calculation to produce a 6-character clean room identifier
  let hash = 0;
  for (let i = 0; i < formattedId.length; i++) {
    hash = formattedId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const roomSuffix = Math.abs(hash).toString(36).substring(0, 4).toUpperCase();
  const defaultRoomCode = `WIFI-${roomSuffix}`;

  res.json({
    ip: clientIp,
    defaultRoomCode,
  });
});

// GET existing room data
app.get("/api/rooms/:roomId/state", (req, res) => {
  const { roomId } = req.params;
  res.json(getRoomState(roomId));
});

// POST to upload a file
app.post("/api/rooms/:roomId/upload", upload.single("file"), (req, res) => {
  const { roomId } = req.params;
  const { sender } = req.body;

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const fileMetadata: FileMetadata = {
    id: Math.random().toString(36).substring(2, 12),
    roomId: roomId.toUpperCase(),
    originalName: req.file.originalname,
    uniqueName: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiration
    sender: sender || "Anonymous Device",
  };

  sharedFiles.push(fileMetadata);

  // Notify everyone in the room
  broadcastToRoom(roomId.toUpperCase(), "files_updated", getRoomState(roomId.toUpperCase()));

  res.status(200).json(fileMetadata);
});

// DELETE to remove a file manually
app.delete("/api/rooms/:roomId/files/:fileId", (req, res) => {
  const { roomId, fileId } = req.params;

  const fileIndex = sharedFiles.findIndex((f) => f.id === fileId && f.roomId === roomId.toUpperCase());
  if (fileIndex !== -1) {
    const file = sharedFiles[fileIndex];
    sharedFiles.splice(fileIndex, 1);

    // Remote filesystem delete
    const filePath = path.join(uploadDir, file.uniqueName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error removing file from disk:", err);
      }
    }

    broadcastToRoom(roomId.toUpperCase(), "files_updated", getRoomState(roomId.toUpperCase()));
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Download a file
app.get("/api/download/:fileId", (req, res) => {
  const { fileId } = req.params;
  const file = sharedFiles.find((f) => f.id === fileId);

  if (!file) {
    res.status(404).send("File not found or has expired from cache.");
    return;
  }

  const filePath = path.join(uploadDir, file.uniqueName);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("The requested file does not exist on disk.");
    return;
  }

  res.download(filePath, file.originalName);
});

// Real-time server-sent events for syncing room changes
app.get("/api/rooms/:roomId/events", (req, res) => {
  const { roomId } = req.params;
  const clientId = req.query.clientId as string;
  const userName = (req.query.userName as string) || "Guest Device";

  if (!clientId) {
    res.status(400).send("clientId is required");
    return;
  }

  const parsedRoomId = roomId.toUpperCase();

  // Set necessary headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Register client
  const newClient: sseClient = {
    id: clientId,
    roomId: parsedRoomId,
    userName,
    res,
  };
  sseClients.push(newClient);

  // Send immediate initial sync
  res.write(`event: init\ndata: ${JSON.stringify(getRoomState(parsedRoomId))}\n\n`);

  // Broadcast peer list update
  broadcastToRoom(parsedRoomId, "peers_updated", getRoomState(parsedRoomId));

  // Pulse a heartbeat every 15 seconds to keep connection active
  const heartbeatTimer = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  // Close connection clean up
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    sseClients = sseClients.filter((c) => c.res !== res);
    broadcastToRoom(parsedRoomId, "peers_updated", getRoomState(parsedRoomId));
    res.end();
  });
});

// Mount Vite middleware for dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
