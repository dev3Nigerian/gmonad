"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import GMDashboard from "../components/GMDashboard";
import GMEvents from "../components/GMEvents";
import GMLeaderboard from "../components/GMLeaderboard";
import GMProfile from "../components/GMProfile";
// import GMSearch from "../components/GMSearch";
import type { NextPage } from "next";
import { SunIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  const [mounted, setMounted] = useState(false);

  // Animation effect when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Monad Logo Background */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none overflow-hidden z-0">
        <div className="animate-pulse-slow">
          <Image src="/monad-logo.png" alt="Monad Logo" width={600} height={600} className="opacity-30" />
        </div>
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex items-center flex-col flex-grow pt-10 transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <div className="px-5 w-full max-w-6xl">
          {/* Animated Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-2 rounded-xl bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-purple-500/50 bg-size-200 animate-gradient-xy mb-4">
              <div className="flex items-center justify-center text-5xl font-extrabold bg-base-100 p-6 rounded-lg">
                <SunIcon className="h-12 w-12 mr-3 text-yellow-500 animate-spin-slow" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 whitespace-nowrap">
                  Daily GMONAD
                </span>
                <Image src="/monad-logo.png" alt="Monad Logo" width={48} height={48} className="ml-3" />
              </div>
            </div>
            <div className="animate-fade-in-up">
              <span className="inline-block text-xl font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent px-4">
                Say GMONAD on Monad Testnet once per day!
              </span>
            </div>
          </div>

          {/* User Profile/Connect Button */}
          <div className="animate-fade-in-up animation-delay-300">
            <GMProfile />
          </div>

          {/* Main Dashboard with animation */}
          <div className="animate-fade-in-up animation-delay-500">
            <GMDashboard />
          </div>

          {/* Search with animation */}

          {/* Leaderboard with animation */}
          <div className="animate-fade-in-up animation-delay-600">
            <GMLeaderboard />
          </div>

          {/* Recent GM Events with animation */}
          <div className="animate-fade-in-up animation-delay-700">
            <GMEvents />
          </div>

          {/* About section with enhanced styling */}
          <div className="mt-16 bg-gradient-to-r from-purple-900/5 to-blue-900/5 p-8 rounded-xl text-center shadow-lg border border-purple-500/10 animate-fade-in-up animation-delay-900">
            <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              About Daily GMONAD
            </h2>
            <p className="text-base opacity-90 max-w-2xl mx-auto leading-relaxed">
              Daily GMONAD is a simple Ethereum smart contract that lets you record a &quot;GM&quot; (Good Morning Nads)
              message on the blockchain once every 24 hours. You can either say GM to everyone or direct it to a
              specific address. This is a fun way to engage with the Monad community and establish a daily on-chain
              ritual!
            </p>
          </div>

          {/* Footer with credits */}
          <div className="mt-16 mb-8 text-center text-sm opacity-50 animate-fade-in-up animation-delay-1000">
            <p>Built with 💜 on Monad Testnet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
