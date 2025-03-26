"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
// Import wagmi hook to get user's address
import { Address } from "~~/components/scaffold-eth";

type LeaderboardEntry = {
  address: string;
  username: string | null;
  discordUsername?: string;
  twitterUsername?: string;
  count: number;
  streak: number;
  lastGM: number;
};

const GMLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null); // State for logged-in user's entry
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"allTime" | "weekly" | "daily">("allTime");
  const { address: userAddress } = useAccount(); // Get the connected user's address

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      console.log("Starting fetchLeaderboardData...");
      try {
        setIsLoading(true);
        console.log(`Fetching leaderboard for timeframe: ${timeframe}`);
        const response = await axios.get(`/api/auth/leaderboard?timeframe=${timeframe}`);
        // const data = await response.json();
        const data = response.data;
        console.log("Leaderboard API response:", data);

        if (!data.success || !data.entries) {
          console.log("No leaderboard data found for timeframe:", timeframe);
          setLeaderboard([]);
          setUserEntry(null);
          return;
        }

        const entries = data.entries as LeaderboardEntry[];
        setLeaderboard(entries.slice(0, 10)); // Top 10

        // Find the logged-in user's entry
        if (userAddress) {
          const userLowercase = userAddress.toLowerCase();
          const userData = entries.find(entry => entry.address.toLowerCase() === userLowercase);
          setUserEntry(userData || null);
        } else {
          setUserEntry(null);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboard([]);
        setUserEntry(null);
      } finally {
        setIsLoading(false);
        console.log("Fetch complete");
      }
    };

    fetchLeaderboardData();
  }, [timeframe, userAddress]); // Add userAddress as a dependency

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Calculate user's rank (1-based index)
  const getUserRank = () => {
    if (!userEntry || !leaderboard.length) return "N/A";
    const userIndex = leaderboard.findIndex(entry => entry.address.toLowerCase() === userAddress?.toLowerCase());
    return userIndex !== -1 ? userIndex + 1 : "Not in Top 10";
  };

  return (
    <div className="mt-12 w-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🏆 GM Leaderboard</h2>
        <div className="tabs tabs-boxed">
          <a className={`tab ${timeframe === "allTime" ? "tab-active" : ""}`} onClick={() => setTimeframe("allTime")}>
            All Time
          </a>
          <a className={`tab ${timeframe === "weekly" ? "tab-active" : ""}`} onClick={() => setTimeframe("weekly")}>
            Weekly
          </a>
          <a className={`tab ${timeframe === "daily" ? "tab-active" : ""}`} onClick={() => setTimeframe("daily")}>
            Daily
          </a>
        </div>
      </div>

      {/* User's Rank and Details */}
      {userAddress && (
        <div className="mb-6 bg-base-100 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Your Stats</h3>
          {userEntry ? (
            <div className="mt-2">
              <p>
                <strong>Rank:</strong> {getUserRank()}
              </p>
              <p>
                <strong>Address:</strong> <Address address={userEntry.address} />
              </p>
              {userEntry.username && (
                <p>
                  <strong>Username:</strong> {userEntry.username}
                </p>
              )}
              <p>
                <strong>GM Count:</strong> {userEntry.count}
              </p>
              <p>
                <strong>Streak:</strong> {userEntry.streak} 🔥
              </p>
              <p>
                <strong>Last GM:</strong> {formatTimestamp(userEntry.lastGM)}
              </p>
              <p>
                <strong>Score:</strong> {userEntry.count * 10 + userEntry.streak * 5}
              </p>
            </div>
          ) : (
            <p className="mt-2 opacity-70">You haven’t said GM yet in this timeframe.</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 bg-base-200 rounded-xl">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 opacity-70">Building leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-10 bg-base-200 rounded-xl">
          <p className="opacity-70">No GM activity found for this timeframe.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-center">Rank</th>
                <th>User</th>
                <th className="text-center">GM Count</th>
                <th className="text-center">Streak</th>
                <th className="text-center">Last GM</th>
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={entry.address}
                  className={`hover ${userAddress && entry.address.toLowerCase() === userAddress.toLowerCase() ? "bg-primary bg-opacity-20" : ""}`}
                >
                  <td className="text-center font-bold">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      {entry.username && <span className="text-sm font-bold text-primary">{entry.username}</span>}
                      <Address address={entry.address} />
                      <div className="flex mt-1 space-x-1">
                        {entry.discordUsername && (
                          <span className="text-xs badge badge-outline text-indigo-500 border-indigo-300">Discord</span>
                        )}
                        {entry.twitterUsername && (
                          <span className="text-xs badge badge-outline text-blue-500 border-blue-300">Twitter</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center">{entry.count}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center">
                      <span className="font-mono">{entry.streak}</span>
                      <span className="ml-1 text-orange-500">🔥</span>
                    </div>
                  </td>
                  <td className="text-center">{formatTimestamp(entry.lastGM)}</td>
                  <td className="text-center font-bold">{entry.count * 10 + entry.streak * 5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 bg-base-200 p-3 rounded-lg text-sm opacity-80">
        <p>
          <span className="font-bold">🛡️ Anti-Bot Protection:</span> Our system detects and filters out suspicious
          activity. Consistent daily greetings from verified accounts get higher scores.
        </p>
      </div>
    </div>
  );
};

export default GMLeaderboard;
