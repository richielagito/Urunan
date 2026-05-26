import React from "react";
import type { Metadata } from "next";
import UrunanAppClient from "./UrunanAppClient";

export const metadata: Metadata = {
  title: "Kanvas Urunan - Patungan Adil & Asik",
  description: "Kelola struk patungan bareng kru kamu dengan physics engine interaktif.",
};

export default function AppPage() {
  return <UrunanAppClient />;
}
