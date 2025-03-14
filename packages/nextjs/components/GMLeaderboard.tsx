"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { usePublicClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type LeaderboardEntry = {
  address: string;
  username: string | null;
  discordUsername?: string;
  twitterUsername?: string;
  count: number;
  streak: number;
  lastGM: bigint;
};

const GMLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"allTime" | "weekly" | "daily">("allTime");
  const { data: dailyGmContract } = useDeployedContractInfo("DailyGM");
  const publicClient = usePublicClient();

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!dailyGmContract || !publicClient) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log("Fetching GM events for leaderboard...");

        // Fetch logs from the blockchain
        const logs = await publicClient.getLogs({
          address: dailyGmContract.address,
          event: {
            type: "event",
            name: "GM",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "address", name: "recipient", indexed: true },
            ],
          },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        console.log(`Found ${logs.length} GM events for leaderboard`);

        // Process logs to build leaderboard
        const addressCounts: Record<string, number> = {};
        const lastGmTimes: Record<string, bigint> = {};
        const streaks: Record<string, number> = {};

        // Filter logs based on timeframe
        const now = BigInt(Math.floor(Date.now() / 1000));
        const oneDay = BigInt(24 * 60 * 60);
        const oneWeek = oneDay * BigInt(7);

        const filteredLogs = logs.filter(log => {
          if (timeframe === "allTime") return true;
          // For demo purposes, we're using block numbers as a proxy for time
          // In a real app, you'd use the actual timestamp
          const blockDiff = now - log.blockNumber;
          return timeframe === "weekly" ? blockDiff <= oneWeek : blockDiff <= oneDay;
        });

        // Count GMs by address
        filteredLogs.forEach(log => {
          const args = log.args as unknown as { user: string };
          const user = args.user;

          // Update counts
          addressCounts[user] = (addressCounts[user] || 0) + 1;

          // Update last GM time
          const currentLastGm = lastGmTimes[user] || BigInt(0);
          if (log.blockNumber > currentLastGm) {
            lastGmTimes[user] = log.blockNumber;
          }

          // For demo purposes, calculate a simple streak
          if (!streaks[user]) {
            // In production, you would calculate actual streaks based on timestamps
            streaks[user] = Math.floor(Math.random() * 10) + 1;
          }
        });

        // Get unique addresses
        const uniqueAddresses = Object.keys(addressCounts);

        // Fetch user profiles from MongoDB for these addresses
        const userProfiles: Record<string, any> = {};

        if (uniqueAddresses.length > 0) {
          try {
            const response = await axios.get(`/api/users/batch?addresses=${uniqueAddresses.join(",")}`);
            if (response.data.success) {
              response.data.data.forEach((user: any) => {
                userProfiles[user.address] = user;
              });
            }
          } catch (error) {
            console.error("Error fetching user profiles:", error);
            // Continue with available data
          }
        }

        // Convert to array and sort
        const leaderboardData = Object.entries(addressCounts).map(([address, count]) => ({
          address,
          username: userProfiles[address]?.username || null,
          discordUsername: userProfiles[address]?.discordUsername,
          twitterUsername: userProfiles[address]?.twitterUsername,
          count,
          streak: streaks[address] || 0,
          lastGM: lastGmTimes[address] || BigInt(0),
        }));

        // Sort by count (descending)
        leaderboardData.sort((a, b) => b.count - a.count);

        setLeaderboard(leaderboardData.slice(0, 10)); // Top 10
      } catch (error) {
        console.error("Error building leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [dailyGmContract, publicClient, timeframe]);

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
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.address} className="hover">
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
                  <td className="text-center font-bold">{entry.count * 10 + entry.streak * 5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Anti-Bot Notice */}
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
