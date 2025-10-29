<h1 align="center">🎥 Video Stream & Recorder App (MERN + TypeScript)</h1>

<p align="center">
  <b>A modern full-stack web app that records, streams, and stores user videos in real time — built with the MERN stack and TypeScript.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Database-MongoDB-brightgreen?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Language-TypeScript-007ACC?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Video%20Processing-FFmpeg-orange?style=for-the-badge&logo=ffmpeg" />
</p>

---

## 🚀 Overview

This project lets users **record videos directly from their browser**, upload them in real-time via **Socket.IO**, and **store & manage** recordings efficiently.  
Each recording is chunked, saved on the server, and retrievable later for preview or download as `.mp4`.

Built for performance, simplicity, and scalability — perfect for real-time media use-cases and machine test demos.

---

## 🧩 Key Features

- 🎬 Record webcam video + audio directly in browser  
- ⚡ Real-time chunk upload with Socket.IO  
- 💾 Store videos locally (filesystem) + metadata in MongoDB  
- 🔄 Convert `.webm` → `.mp4` using FFmpeg in-browser  
- 🌐 Built entirely with TypeScript (frontend + backend)  
- 🎨 Modern responsive UI with gradients & animations  
- 📁 View and download saved videos anytime  

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React + TypeScript + Vite |
| **Backend** | Node.js + Express + Socket.IO |
| **Database** | MongoDB + Mongoose |
| **Video Handling** | FFmpeg (via `@ffmpeg/ffmpeg`) |
| **Styling** | CSS + Inline styles (Neumorphism + gradients) |

---

## 🏗️ Project Structure

video_stream_store_app/
├── client/ # Frontend (React + TypeScript)
│ ├── src/
│ │ ├── App.tsx # Camera Recorder logic
│ │ └── pages/
│ │ └── SavedVideos.tsx # Saved video listing
│ ├── package.json
│ └── tsconfig.json
│
├── server/ # Backend (Express + Socket.IO)
│ ├── src/
│ │ ├── server.ts # Main server logic
│ │ └── models/
│ │ └── Video.ts # Mongoose schema
│ └── uploads/ # Recorded .webm files
│
├── package.json
└── README.md

## ⚙️ Setup & Run Locally

### 1️⃣ Clone this repo
```bash
git clone https://github.com/ImanSamantaCoder/video_stream_store_app.git
cd video_stream_store_app
2️⃣ Setup the backend
cd server
npm install
Run:
npm run dev
3️⃣ Setup the frontend
cd ../client
npm install
npm start
## 🧠 How It Works

1. 🎬 User starts recording → `MediaRecorder` captures webcam stream.  
2. ⚡ Each video chunk is streamed to the backend via **Socket.IO**.  
3. 💾 Backend writes chunks to a temporary `.webm` file.  
4. 🟥 On stop, the file is finalized and stored in the `/uploads` directory.  
5. 🎞️ User can view or download** from the **Saved Videos** page.  
6. 🔄 FFmpeg converts the `.webm` file to `.mp4` for easy playback.  

---

## 🧩 Future Enhancements

- ☁️ Store videos in AWS S3 or Cloudinary  
- 🔐 Add user authentication 
- 🔄 Enable real-time playback streaming
- 📈 Add progress bar & video compression 
- 🧩 Integrate Kafka or RabbitMQ for scalable upload handling
 



