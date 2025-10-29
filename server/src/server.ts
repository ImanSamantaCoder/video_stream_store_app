import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Video } from "./models/video";

interface StreamSession {
  writeStream: fs.WriteStream;
  tmpPath: string;
  finalPath: string;
  filename: string;
  mimeType: string;
  size: number;
}

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// 📁 Upload directory
// -----------------------------
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// -----------------------------
// 🧩 MongoDB setup
// -----------------------------
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/camera_stream_ts";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

// -----------------------------
// 🌐 REST endpoints
// -----------------------------
app.get("/videos", async (_req: Request, res: Response) => {
  const list = await Video.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

app.get("/videos/:id/download", async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).send("Video not found");
    res.download(video.path, video.filename);
  } catch (err) {
    console.error(err);
    res.status(500).send("Download error");
  }
});

// -----------------------------
// ⚡ Socket.IO setup
// -----------------------------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const streams: Record<string, StreamSession> = {};

io.on("connection", (socket) => {
  console.log("🎥 Client connected:", socket.id);

  // ✅ Start new recording session
  socket.on(
    "startRecording",
    (
      { filename }: { filename: string },
      callback: (data: { sessionId: string }) => void
    ) => {
      const id = uuidv4();
      const safeFilename = (filename || `recording_${Date.now()}.webm`).replace(
        /[^a-z0-9_.-]/gi,
        "_"
      );

      // ✅ Always write to .tmp first
      const tmpPath = path.join(UPLOAD_DIR, `${id}.tmp`);
      const finalPath = path.join(UPLOAD_DIR, `${id}.webm`);
      const ws = fs.createWriteStream(tmpPath, { flags: "a" });

      streams[id] = {
        writeStream: ws,
        tmpPath,
        finalPath,
        filename: safeFilename,
        mimeType: "video/webm",
        size: 0,
      };

      ws.on("error", (err) => console.error("❌ Stream error:", err));
      console.log("🟢 Recording started:", id);

      callback?.({ sessionId: id }); // send sessionId to frontend
    }
  );

  // ✅ Handle incoming binary chunks
  socket.on("chunk", (data: { sessionId: string; buffer: ArrayBuffer }) => {
    const { sessionId, buffer } = data;
    const s = streams[sessionId];
    if (!s || !buffer) {
      console.warn("⚠️ Skipped chunk:", sessionId);
      return;
    }

    // If stream is already closed, ignore late chunks
    if (s.writeStream.writableEnded) {
  console.warn(`⚠️ Late chunk ignored (stream already ended): ${sessionId}`);
  return;
}


    const buf = Buffer.from(buffer);
    s.writeStream.write(buf, (err) => {
      if (err) console.error("❌ Write error:", err);
    });
    s.size += buf.length;

    console.log(`📦 Chunk → ${sessionId}, ${buf.length} bytes (total ${s.size})`);
  });

  // ✅ Stop recording and save video
  socket.on("stopRecording", async ({ sessionId }) => {
    const s = streams[sessionId];
    if (!s) {
      console.warn("⚠️ stopRecording called for missing session:", sessionId);
      socket.emit("error", "No active stream");
      return;
    }

    console.log(`🟥 STOP → session ${sessionId}, total size ${s.size}`);
    await new Promise((resolve) => s.writeStream.end(resolve));
    console.log(`✅ Stream closed for ${sessionId}`);

    // ✅ Rename safely
    if (fs.existsSync(s.tmpPath)) {
      fs.renameSync(s.tmpPath, s.finalPath);
      console.log(`📁 File renamed → ${s.finalPath}`);
    } else {
      console.warn(`⚠️ Temp file not found, using finalPath directly`);
    }

    const stat = fs.existsSync(s.finalPath)
      ? fs.statSync(s.finalPath)
      : { size: s.size };

    // ✅ Save video metadata in Mongo
    const videoDoc = await Video.create({
      sessionId,
      filename: s.filename,
      path: s.finalPath,
      size: stat.size,
      mimeType: s.mimeType,
    });

    delete streams[sessionId];

    socket.emit("recordingStopped", { sessionId, videoId: videoDoc._id });
    console.log(
      `🔴 Recording stopped: ${sessionId} (${(stat.size / 1024).toFixed(1)} KB)`
    );
  });

  socket.on("disconnect", () => console.log("❌ Disconnected:", socket.id));
});

// -----------------------------
// 🚀 Start server
// -----------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
