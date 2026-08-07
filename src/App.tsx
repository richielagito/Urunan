import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import UrunanAppClient from "@/pages/UrunanAppClient";

function RootRoute() {
  const hasVisited = localStorage.getItem("urunan_has_visited") === "true";
  
  if (hasVisited) {
    return <Navigate to="/app" replace />;
  }
  
  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/app" element={<UrunanAppClient />} />
      </Routes>
    </BrowserRouter>
  );
}
