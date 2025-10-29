import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App"; // your recorder page
import SavedVideos from "./pages/SavedVideos"; // the second page

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/videos" element={<SavedVideos />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
