"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { Button } from "@/components/_ui/Button";
import LoadingSpinner from "@/components/_ui/LoadingSpinner";
import { Navbar } from "@/components/_ui/Navbar";
import VerifyFormSection from "@/components/verifypage/VerifyFormSection";
import blockchainAnimation from "@/public/assets/blockchain.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function VerifyPage() {
  return (
    <main className="min-h-screen">
      <Navbar className="dark">
        <Button variant="secondary" href="/">
          Home
        </Button>
        <Button variant="primary" href="/login">
          Login
        </Button>
      </Navbar>
      <section className="flex flex-col lg:flex-row items-center justify-center min-h-[70vh] px-4 py-12 gap-16 w-full max-w-5xl mx-auto">
        {/* Left: Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col items-center">
            <h3>Verify Document</h3>
            <Suspense fallback={<LoadingSpinner />}>
              <VerifyFormSection />
            </Suspense>
          </div>
        </div>
        {/* Right: Lottie Animation */}
        <div className="hidden lg:flex w-1/2 h-full items-center justify-center">
          <div className="w-full max-w-xl h-[32rem] flex items-center justify-center">
            <Lottie
              autoplay
              loop
              animationData={blockchainAnimation}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
