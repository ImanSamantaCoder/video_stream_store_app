import React, { useEffect, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

interface VideoMeta {
  _id: string;
  filename: string;
  size: number;
  createdAt: string;
}

const SERVER_URL = "http://localhost:4000";
const ffmpeg = new FFmpeg();

const SavedVideos: React.FC = () => {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/videos`);
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    }
  };

  const convertToMp4 = async (v: VideoMeta) => {
    try {
      setConvertingId(v._id);

      if (!ffmpeg.loaded) {
        console.log("⏳ Loading FFmpeg...");
        await ffmpeg.load();
        console.log("✅ FFmpeg loaded!");
      }

      const url = `${SERVER_URL}/videos/${v._id}/download`;
      console.log("🎞️ Fetching", url);
      const response = await fetch(url);
      const blob = await response.blob();

      // Write file into FFmpeg FS
      await ffmpeg.writeFile("input.webm", await fetchFile(blob));

      // Run FFmpeg conversion
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

      // Read converted file
      const data = await ffmpeg.readFile("output.mp4");
      const arrayBuffer =
        typeof data === "string"
          ? new TextEncoder().encode(data).buffer
          : (data as Uint8Array).buffer;

      const mp4Blob = new Blob([arrayBuffer], { type: "video/mp4" });
      const mp4Url = URL.createObjectURL(mp4Blob);

      const a = document.createElement("a");
      a.href = mp4Url;
      a.download = v.filename.replace(".webm", ".mp4");
      a.click();
      URL.revokeObjectURL(mp4Url);

      console.log(`✅ ${v.filename} converted to MP4`);
    } catch (err) {
      console.error("❌ Conversion failed:", err);
      alert("Failed to convert video.");
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1f1c2c, #928dab)",
        color: "white",
        fontFamily: "'Poppins', sans-serif",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 600,
          textShadow: "0 2px 10px rgba(0,0,0,0.3)",
          marginBottom: "25px",
        }}
      >
        🎞️ Saved Videos
      </h1>

      <button
        onClick={() => window.history.back()}
        style={{
          background: "linear-gradient(90deg, #2196f3, #64b5f6)",
          border: "none",
          color: "white",
          padding: "12px 25px",
          borderRadius: "10px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(33,150,243,0.4)",
          marginBottom: "30px",
        }}
      >
        ⬅️ Back to Recorder
      </button>

      {videos.length === 0 ? (
        <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>
          😔 No saved videos found.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "25px",
            width: "100%",
            maxWidth: "1000px",
          }}
        >
          {videos.map((v) => (
            <div
              key={v._id}
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "15px",
                padding: "20px",
                backdropFilter: "blur(8px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              <h3
                style={{
                  marginBottom: "8px",
                  fontSize: "1rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={v.filename}
              >
                {v.filename}
              </h3>
              <p style={{ margin: "4px 0", opacity: 0.85 }}>
                🗓 {new Date(v.createdAt).toLocaleString()}
              </p>
              <p style={{ margin: "4px 0", opacity: 0.85 }}>
                💾 {(v.size / 1024).toFixed(1)} KB
              </p>

              <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                <a
                  href={`${SERVER_URL}/videos/${v._id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "linear-gradient(90deg, #00c853, #b2ff59)",
                    color: "#000",
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    boxShadow: "0 3px 10px rgba(0,200,83,0.4)",
                  }}
                >
                  ⬇️ WebM
                </a>

                <button
                  onClick={() => convertToMp4(v)}
                  disabled={convertingId === v._id}
                  style={{
                    background: "linear-gradient(90deg, #ff6f00, #ffca28)",
                    color: "#000",
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    opacity: convertingId === v._id ? 0.6 : 1,
                    boxShadow: "0 3px 10px rgba(255,111,0,0.4)",
                  }}
                >
                  {convertingId === v._id ? "⏳ Converting..." : "🎬 MP4"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedVideos;
