import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import UrunanAppClient from "@/pages/UrunanAppClient";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<UrunanAppClient />} />
      </Routes>
    </BrowserRouter>
  );
}
