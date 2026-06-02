import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Shield, UserX, ScanText, ArrowRight } from "lucide-react";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  return (
    <div className={styles.landingContainer}>

      {/* Background Orbs for Glassmorphism Context */}
      <div className={styles.ambientOrb1} />
      <div className={styles.ambientOrb2} />

      {/* Main Content */}
      <main className={styles.mainContent}>

        {/* Hero Section */}
        <div className={styles.heroSection}>
          <h1 className={styles.heroTitle}>urunan</h1>

          <div className={styles.dictionaryBlock}>
            <div>
              <span className={styles.wordDefinition}>/urun·an/</span>
              <span className={styles.wordType}>(Nomina)</span>
            </div>
            <p className={styles.wordMeaning}>
              Kontribusi uang untuk tujuan bersama; iuran; patungan.
            </p>
          </div>

          <p className={styles.heroDesc}>
            Cara baru patungan bareng temen yang asik, adil dan transparan. Nggak ada lagi drama soal siapa bayar apa.
          </p>

          <Link to="/app" className={styles.ctaButton}>
            <span>Cobain Gratis</span>
            <ArrowRight className={`w-5 h-5 ${styles.ctaIcon}`} />
          </Link>
        </div>

        {/* Features Section */}
        <div className={styles.featuresSection}>

          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconEmerald}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className={styles.featureTitle}>Gratis Selamanya</h3>
            <p className={styles.featureDesc}>
              Nggak ada biaya berlangganan. Semua fitur premium bisa kamu pakai gratis sampai kapanpun.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <Shield className="w-6 h-6" />
            </div>
            <h3 className={styles.featureTitle}>Private & Aman</h3>
            <p className={styles.featureDesc}>
              Data kamu aman dan nggak disimpan di server pihak ketiga. Semua kalkulasi berjalan langsung di perangkatmu.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconRose}`}>
              <UserX className="w-6 h-6" />
            </div>
            <h3 className={styles.featureTitle}>Tanpa Perlu Akun</h3>
            <p className={styles.featureDesc}>
              Langsung pakai tanpa perlu repot registrasi, login, atau masukin email. Cepat dan anti-ribet.
            </p>
          </div>

          {/* Feature 4 */}
          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
              <ScanText className="w-6 h-6" />
            </div>
            <h3 className={styles.featureTitle}>Scan Struk Pake AI</h3>
            <p className={styles.featureDesc}>
              Input item otomatis dengan sistem BYOK (Bring Your Own Key) yang super pintar dari Gemini AI.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerText}>
            &copy; {new Date().getFullYear()} Urunan. All rights reserved.
          </div>
          <div className={styles.madeBy}>
            <span>Made by</span>
            <a
              href="https://www.richielagito.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.madeByLink}
            >
              Richie
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
