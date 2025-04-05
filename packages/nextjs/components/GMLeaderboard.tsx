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
  receivedCount: number;
  streak: number;
  lastGM: number;
};

const GMLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null); // State for logged-in user's entry
  const [userRank, setUserRank] = useState<string | number>("N/A");
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
        const data = response.data;
        console.log("Leaderboard API response:", data);

        if (!data.success || !data.entries) {
          console.log("No leaderboard data found for timeframe:", timeframe);
          setLeaderboard([]);
          setUserEntry(null);
          setUserRank("N/A");
          return;
        }

        const entries = data.entries as LeaderboardEntry[];
        setLeaderboard(entries.slice(0, 10)); // Top 10

        // Find the logged-in user's entry
        if (userAddress) {
          const userLowercase = userAddress.toLowerCase();
          const userData = entries.find(entry => entry.address.toLowerCase() === userLowercase);
          setUserEntry(userData || null);

          // Calculate user's rank
          if (userData) {
            const position = entries.findIndex(entry => entry.address.toLowerCase() === userLowercase);
            setUserRank(position !== -1 ? position + 1 : "Not in Top 100");
          } else {
            setUserRank("Not Ranked");
          }
        } else {
          setUserEntry(null);
          setUserRank("N/A");
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboard([]);
        setUserEntry(null);
        setUserRank("N/A");
      } finally {
        setIsLoading(false);
        console.log("Fetch complete");
      }
    };

    fetchLeaderboardData();
  }, [timeframe, userAddress]);

  // Update your formatting function to explicitly handle different inputs
  const formatTimestamp = (timestamp: number) => {
    // Always ensure timestamp is treated as a number
    const timestampNumber = Number(timestamp);

    // Convert from seconds to milliseconds for the Date constructor
    return new Date(timestampNumber * 1000).toLocaleString();
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
              <div className="flex flex-wrap justify-between items-center mb-2">
                <p>
                  <strong>Rank:</strong> {typeof userRank === "number" ? `#${userRank}` : userRank}
                </p>
                <div className="badge badge-primary">{userEntry.receivedCount} messages received</div>
              </div>

              <p>
                <strong>Address:</strong> <Address address={userEntry.address} />
              </p>

              {userEntry.username && (
                <p>
                  <strong>Username:</strong> {userEntry.username}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-base-200 p-2 rounded-md">
                  <p className="text-sm opacity-70">GM Sent</p>
                  <p className="text-xl font-bold">{userEntry.count}</p>
                </div>

                <div className="bg-base-200 p-2 rounded-md">
                  <p className="text-sm opacity-70">GM Received</p>
                  <p className="text-xl font-bold">{userEntry.receivedCount}</p>
                </div>

                <div className="bg-base-200 p-2 rounded-md">
                  <p className="text-sm opacity-70">Current Streak</p>
                  <p className="text-xl font-bold flex items-center">
                    {userEntry.streak}
                    <span className="ml-1 text-orange-500">🔥</span>
                  </p>
                </div>

                <div className="bg-base-200 p-2 rounded-md">
                  <p className="text-sm opacity-70">Last GM</p>
                  <p className="text-sm font-bold">{formatTimestamp(userEntry.lastGM)}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-base-300">
                <p className="font-semibold flex justify-between">
                  <span>Total Score:</span>
                  <span className="text-primary text-lg">{userEntry.count * 10 + userEntry.streak * 5}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="opacity-70">You haven&apos;t said GM yet in this timeframe.</p>
              {/* <button 
                className="btn btn-primary btn-sm mt-2"
                onClick={() => window.location.href = "/gm"}
              >
                Say GM Now
              </button> */}
            </div>
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
                <th className="text-center">GM Sent</th>
                <th className="text-center">GM Received</th>
                <th className="text-center">Streak</th>
                <th className="text-center">Last GM</th>
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard
                .map(entry => ({
                  ...entry,
                  score: entry.count * 10 + entry.streak * 5 + entry.receivedCount * 2,
                }))
                .sort((a, b) => b.score - a.score)
                .map((entry, index) => (
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
                            <span className="text-xs badge badge-outline text-indigo-500 border-indigo-300">
                              Discord
                            </span>
                          )}
                          {entry.twitterUsername && (
                            <span className="text-xs badge badge-outline text-blue-500 border-blue-300">Twitter</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center">{entry.count}</td>
                    <td className="text-center">{entry.receivedCount}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center">
                        <span className="font-mono">{entry.streak}</span>
                        <span className="ml-1 text-orange-500">🔥</span>
                      </div>
                    </td>
                    <td className="text-center">{formatTimestamp(entry.lastGM)}</td>
                    <td className="text-center font-bold">{entry.score}</td>
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
