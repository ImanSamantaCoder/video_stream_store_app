import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useNavigate } from "react-router-dom";

interface VideoMeta {
  _id: string;
  filename: string;
  size: number;
  createdAt: string;
}

interface RecordingStartedPayload {
  sessionId: string;
}

const SERVER_URL = "http://localhost:4000";
const ffmpeg = new FFmpeg(); // v0.12+

async function fetchFile(
  input: string | Blob | File | ArrayBuffer
): Promise<Uint8Array> {
  if (typeof input === "string") {
    const res = await fetch(input);
    return new Uint8Array(await res.arrayBuffer());
  } else if (input instanceof Blob || input instanceof File) {
    return new Uint8Array(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new Error("Unsupported input type");
}

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [convertingIds, setConvertingIds] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
  const socket = io(SERVER_URL);
  socketRef.current = socket;

  socket.on("connect", () => console.log("✅ Connected to backend"));
  socket.on("recordingStarted", ({ sessionId }: RecordingStartedPayload) =>
    setSessionId(sessionId)
  );
  socket.on("recordingStopped", fetchVideos);

  fetchVideos();

  // ✅ FIX: explicitly return a cleanup function (TypeScript-safe)
  return () => {
    socket.disconnect();
  };
}, []);


  const fetchVideos = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/videos`);
      const data: VideoMeta[] = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    }
  };

  const startCamera = async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    return stream;
  };

  const startRecording = async () => {
    const stream = await startCamera();

    let currentSessionId: string | null = null;
    await new Promise<void>((resolve) => {
      socketRef.current?.emit(
        "startRecording",
        { filename: `user_recording_${Date.now()}.webm` },
        (response: { sessionId: string }) => {
          console.log("📸 Got sessionId:", response.sessionId);
          currentSessionId = response.sessionId;
          setSessionId(response.sessionId);
          resolve();
        }
      );
    });

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (e: BlobEvent) => {
      if (e.data.size > 0 && currentSessionId) {
        const arrBuf = await e.data.arrayBuffer();
        socketRef.current?.emit("chunk", {
          sessionId: currentSessionId,
          buffer: arrBuf,
        });
      }
    };

    recorder.start(1000);
    setRecording(true);
    console.log("🎬 Recording started:", currentSessionId);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (sessionId) socketRef.current?.emit("stopRecording", { sessionId });
  };

  const downloadAsMp4 = async (videoUrl: string, filename: string, id: string) => {
    try {
      setConvertingIds((prev) => ({ ...prev, [id]: true }));

      if (!ffmpeg.loaded) {
        console.log("⏳ Loading FFmpeg...");
        await ffmpeg.load();
        console.log("✅ FFmpeg loaded!");
      }

      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const data = await fetchFile(blob);

      await ffmpeg.writeFile("input.webm", data);
      await ffmpeg.exec([
        "-fflags",
        "+genpts",
        "-i",
        "input.webm",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "output.mp4",
      ]);

      const output = await ffmpeg.readFile("output.mp4");
      const arrayBuffer =
        typeof output === "string"
          ? new TextEncoder().encode(output).buffer
          : (output as Uint8Array).buffer;

      const mp4Blob = new Blob([arrayBuffer], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(".webm", ".mp4");
      a.click();
      URL.revokeObjectURL(url);

      console.log(`🎉 ${filename} converted and downloaded!`);
    } catch (err) {
      console.error("❌ FFmpeg Conversion Failed:", err);
      alert("Conversion failed — check console logs for details.");
    } finally {
      setConvertingIds((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  // 🌈 Modern gradient UI + neumorphic buttons
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "20px", letterSpacing: "1px" }}>
        🎥 Smart Camera Recorder
      </h1>

      <div
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: 640,
            height: 480,
            background: "#000",
            borderRadius: "20px",
            border: "4px solid rgba(255,255,255,0.2)",
          }}
          muted
          playsInline
        />
      </div>

      <div
        style={{
          marginTop: "25px",
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {!recording ? (
          <button
            onClick={startRecording}
            style={{
              padding: "12px 25px",
              borderRadius: "8px",
              background: "#27ae60",
              color: "white",
              border: "none",
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(39,174,96,0.4)",
              transition: "0.3s",
            }}
          >
            🎬 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              padding: "12px 25px",
              borderRadius: "8px",
              background: "#e74c3c",
              color: "white",
              border: "none",
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(231,76,60,0.4)",
              transition: "0.3s",
            }}
          >
            ⏹️ Stop Recording
          </button>
        )}
        <button
          onClick={fetchVideos}
          style={{
            padding: "12px 25px",
            borderRadius: "8px",
            background: "#3498db",
            color: "white",
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(52,152,219,0.4)",
            transition: "0.3s",
          }}
        >
          🔄 Refresh
        </button>

        <button
          onClick={() => navigate("/videos")}
          style={{
            padding: "12px 25px",
            borderRadius: "8px",
            background: "#9b59b6",
            color: "white",
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(155,89,182,0.4)",
            transition: "0.3s",
          }}
        >
          🎞️ See Saved Videos
        </button>
      </div>

      <p style={{ marginTop: "20px", fontSize: "0.9rem", opacity: 0.8 }}>
        {recording ? "Recording in progress..." : "Ready to record a new video!"}
      </p>
    </div>
  );
};

export default App;
