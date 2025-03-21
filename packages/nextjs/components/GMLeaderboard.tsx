"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";

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
  const publicClient = usePublicClient();
  const dailyGmContract = deployedContracts[10143]?.DailyGM;

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      console.log("Starting fetchLeaderboardData...");

      if (!dailyGmContract || !publicClient) {
        console.error("Missing dependencies:", {
          hasContract: !!dailyGmContract,
          hasClient: !!publicClient,
          contractAddress: dailyGmContract?.address,
        });
        setIsLoading(false);
        return;
      }

      console.log("Contract address:", dailyGmContract.address);
      const chainId = await publicClient.getChainId();
      console.log("Connected chain ID:", chainId);

      if (chainId !== 10143) {
        console.warn("Chain ID mismatch! Expected 10143, got:", chainId);
      }

      try {
        setIsLoading(true);

        const currentBlock = await publicClient.getBlockNumber();
        console.log("Current block number:", Number(currentBlock));

        let fromBlock: bigint;
        const BLOCK_RANGE_LIMIT = BigInt(100); // RPC limit
        switch (timeframe) {
          case "daily":
            fromBlock = currentBlock - BigInt(28800);
            break;
          case "weekly":
            fromBlock = currentBlock - BigInt(201600);
            break;
          default:
            fromBlock = BigInt(7653632); // Adjust this to your contract deployment block later
        }

        // Ensure fromBlock doesn't go negative
        fromBlock = fromBlock < BigInt(0) ? BigInt(0) : fromBlock;
        console.log(`Timeframe: ${timeframe}, From block: ${Number(fromBlock)}`);

        // Paginate logs
        let allLogs: any[] = [];
        let startBlock = fromBlock;
        const endBlock = currentBlock;

        while (startBlock <= endBlock) {
          const toBlock =
            startBlock + BLOCK_RANGE_LIMIT - BigInt(1) > endBlock
              ? endBlock
              : startBlock + BLOCK_RANGE_LIMIT - BigInt(1);

          console.log(`Fetching logs from ${Number(startBlock)} to ${Number(toBlock)}`);
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
            fromBlock: startBlock,
            toBlock,
          });

          console.log(`Fetched ${logs.length} logs for range ${Number(startBlock)}-${Number(toBlock)}`);
          allLogs = allLogs.concat(logs);
          startBlock = toBlock + BigInt(1);
        }

        console.log("Total logs collected:", allLogs.length);

        if (allLogs.length === 0) {
          console.log("No events found for timeframe:", timeframe);
          setLeaderboard([]);
          return;
        }

        // Process logs
        const addressCounts: Record<string, number> = {};
        const lastGmTimes: Record<string, bigint> = {};
        const streaks: Record<string, number> = {};

        allLogs.forEach((log, index) => {
          try {
            console.log(`Processing log #${index}:`, log);
            const args = log.args as { user?: string; recipient?: string };
            if (!args.user) {
              console.warn("Log missing user arg:", log);
              return;
            }
            const user = args.user.toLowerCase();
            addressCounts[user] = (addressCounts[user] || 0) + 1;
            lastGmTimes[user] = log.blockNumber || BigInt(0);
            if (!streaks[user]) {
              streaks[user] = 1; // Replace with actual streak logic later
            }
          } catch (error) {
            console.error("Error processing log:", error, log);
          }
        });

        console.log("Processed address counts:", addressCounts);

        const leaderboardData = Object.entries(addressCounts).map(([address, count]) => ({
          address,
          username: null,
          count,
          streak: streaks[address] || 0,
          lastGM: lastGmTimes[address] || BigInt(0),
        }));

        leaderboardData.sort((a, b) => b.count - a.count);
        const topEntries = leaderboardData.slice(0, 10);
        console.log("Top 10 entries before user data:", topEntries);

        // Fetch user data
        const addresses = topEntries.map(entry => entry.address).join(",");
        console.log("Fetching user data for addresses:", addresses);
        const response = await fetch(`/api/users/batch?addresses=${addresses}`);
        const userData = await response.json();
        console.log("User data response:", userData);

        if (userData.success) {
          const enrichedLeaderboard = topEntries.map(entry => {
            const user = userData.data.find((u: any) => u.address.toLowerCase() === entry.address.toLowerCase());
            return {
              ...entry,
              username: user?.username || null,
              twitterUsername: user?.twitterUsername || null,
              discordUsername: user?.discordUsername || null,
            };
          });
          console.log("Final enriched leaderboard:", enrichedLeaderboard);
          setLeaderboard(enrichedLeaderboard);
        } else {
          console.error("Failed to fetch user data:", userData.message);
          setLeaderboard(topEntries);
        }
      } catch (error) {
        console.error("Error in fetchLeaderboardData:", error);
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
        console.log("Fetch complete, isLoading set to false");
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
