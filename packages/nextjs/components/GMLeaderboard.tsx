"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FaDiscord, FaTwitter, FaUser } from "react-icons/fa";
import { useAccount } from "wagmi";
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
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [userRank, setUserRank] = useState<string | number>("N/A");
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"allTime" | "weekly" | "daily">("allTime");
  const { address: userAddress } = useAccount();

  // Function to calculate score
  const calculateScore = (entry: LeaderboardEntry) => {
    return entry.count * 10 + entry.streak * 5 + entry.receivedCount * 2;
  };

  // Function to get display name for a user
  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.twitterUsername) {
      return { name: `@${entry.twitterUsername}`, type: "twitter" };
    } else if (entry.discordUsername) {
      return { name: entry.discordUsername, type: "discord" };
    } else if (entry.username) {
      return { name: entry.username, type: "username" };
    } else {
      return { name: null, type: "address" };
    }
  };

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

        // Sort entries by score before slicing
        const sortedEntries = [...entries].sort((a, b) => calculateScore(b) - calculateScore(a));

        setLeaderboard(sortedEntries.slice(0, 100)); // Store top 100

        // Find the logged-in user's entry
        if (userAddress) {
          const userLowercase = userAddress.toLowerCase();
          const userData = entries.find(entry => entry.address.toLowerCase() === userLowercase);
          setUserEntry(userData || null);

          // Calculate user's rank
          if (userData) {
            // Count how many users have a higher score than the current user
            const position = sortedEntries.findIndex(entry => entry.address.toLowerCase() === userLowercase);
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

  const formatTimestamp = (timestamp: number) => {
    const timestampNumber = Number(timestamp);
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

              <div className="flex items-center gap-2 mb-2">
                <strong>Identity:</strong>
                {userEntry.username && (
                  <span className="flex items-center">
                    <FaUser className="mr-1 text-primary" size={14} />
                    {userEntry.username}
                  </span>
                )}
                {userEntry.twitterUsername && (
                  <span className="flex items-center text-blue-500">
                    <FaTwitter className="mr-1" size={14} />@{userEntry.twitterUsername}
                  </span>
                )}
                {userEntry.discordUsername && (
                  <span className="flex items-center text-indigo-500">
                    <FaDiscord className="mr-1" size={14} />
                    {userEntry.discordUsername}
                  </span>
                )}
              </div>

              <p>
                <strong>Address:</strong> <Address address={userEntry.address} />
              </p>

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
                  <span className="text-primary text-lg">{calculateScore(userEntry)}</span>
                </p>
                <p className="text-xs opacity-70 mt-1">(GM Sent × 10) + (Streak × 5) + (GM Received × 2)</p>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="opacity-70">You haven&apos;t said GM yet in this timeframe.</p>
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
                  score: calculateScore(entry),
                }))
                .slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)
                .map((entry, index) => {
                  const displayInfo = getDisplayName(entry);
                  const actualIndex = (currentPage - 1) * entriesPerPage + index;

                  return (
                    <tr
                      key={entry.address}
                      className={`hover ${userAddress && entry.address.toLowerCase() === userAddress.toLowerCase() ? "bg-primary bg-opacity-20" : ""}`}
                    >
                      <td className="text-center font-bold">
                        {actualIndex === 0
                          ? "🥇"
                          : actualIndex === 1
                            ? "🥈"
                            : actualIndex === 2
                              ? "🥉"
                              : `#${actualIndex + 1}`}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          {displayInfo.name ? (
                            <div className="flex items-center mb-1">
                              {displayInfo.type === "twitter" && <FaTwitter size={14} className="mr-1 text-blue-500" />}
                              {displayInfo.type === "discord" && (
                                <FaDiscord size={14} className="mr-1 text-indigo-500" />
                              )}
                              {displayInfo.type === "username" && <FaUser size={14} className="mr-1 text-primary" />}
                              <span
                                className={`text-sm font-bold ${
                                  displayInfo.type === "twitter"
                                    ? "text-blue-500"
                                    : displayInfo.type === "discord"
                                      ? "text-indigo-500"
                                      : "text-primary"
                                }`}
                              >
                                {displayInfo.name}
                              </span>
                            </div>
                          ) : (
                            <Address address={entry.address} />
                          )}

                          {/* Always show address in smaller text if we're showing a username */}
                          {displayInfo.name && (
                            <div className="text-xs opacity-70">
                              <Address address={entry.address} />
                            </div>
                          )}

                          <div className="flex mt-1 space-x-1">
                            {entry.discordUsername && !displayInfo.name && (
                              <span className="text-xs badge badge-outline text-indigo-500 border-indigo-300">
                                Discord
                              </span>
                            )}
                            {entry.twitterUsername && !displayInfo.name && (
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
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 bg-base-200 p-3 rounded-lg text-sm opacity-80">
        <p>
          <span className="font-bold">🛡️ Anti-Bot Protection:</span> Our system detects and filters out suspicious
          activity. Consistent daily greetings from verified accounts get higher scores.
        </p>
        {/* <p className="mt-1 text-xs">
          <span className="font-semibold">Scoring:</span> (GM Sent × 10) + (Streak × 5) + (GM Received × 2)
        </p> */}
      </div>

      {/* Pagination Controls */}
      {leaderboard.length > entriesPerPage && (
        <div className="flex justify-center mt-6">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              «
            </button>

            {/* Generate page buttons */}
            {Array.from({ length: Math.min(5, Math.ceil(leaderboard.length / entriesPerPage)) }, (_, i) => {
              // Show current page and nearby pages
              let pageToShow;
              const totalPages = Math.ceil(leaderboard.length / entriesPerPage);

              if (totalPages <= 5) {
                // If 5 or fewer pages, show all
                pageToShow = i + 1;
              } else if (currentPage <= 3) {
                // If near start, show first 5 pages
                pageToShow = i + 1;
              } else if (currentPage >= totalPages - 2) {
                // If near end, show last 5 pages
                pageToShow = totalPages - 4 + i;
              } else {
                // Otherwise show 2 before and 2 after current page
                pageToShow = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageToShow}
                  className={`join-item btn btn-sm ${currentPage === pageToShow ? "btn-active" : ""}`}
                  onClick={() => setCurrentPage(pageToShow)}
                >
                  {pageToShow}
                </button>
              );
            })}

            <button
              className="join-item btn btn-sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(leaderboard.length / entriesPerPage)))}
              disabled={currentPage === Math.ceil(leaderboard.length / entriesPerPage)}
            >
              »
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-center mt-2 opacity-60">
        Showing entries {Math.min((currentPage - 1) * entriesPerPage + 1, leaderboard.length)} -{" "}
        {Math.min(currentPage * entriesPerPage, leaderboard.length)} of {leaderboard.length}
      </div>
    </div>
  );
};

export default GMLeaderboard;
