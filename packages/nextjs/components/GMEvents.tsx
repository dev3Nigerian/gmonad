"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

type GMEvent = {
  id: string;
  user: string;
  recipient: string;
  blockNumber: bigint;
  timestamp: Date;
};

const GMEvents = () => {
  const [events, setEvents] = useState<GMEvent[]>([]);
  const { data: dailyGmContract } = useDeployedContractInfo("DailyGM");
  const publicClient = usePublicClient();
  const { address: connectedAddress } = useAccount();

  // Watch for GM events
  useEffect(() => {
    if (!dailyGmContract || !publicClient) return;

    // Create the event listener
    const unwatch = publicClient.watchEvent({
      address: dailyGmContract.address,
      event: {
        type: "event",
        name: "GM",
        inputs: [
          { type: "address", name: "user", indexed: true },
          { type: "address", name: "recipient", indexed: true },
        ],
      },
      onLogs: logs => {
        for (const log of logs) {
          const args = log.args as unknown as { user: string; recipient: string };
          const newEvent: GMEvent = {
            id: `${log.blockNumber}-${log.transactionIndex ?? "0"}`,
            user: args.user,
            recipient: args.recipient,
            blockNumber: log.blockNumber,
            timestamp: new Date(),
          };

          setEvents(prev => {
            // Check if this event is already in our list
            const exists = prev.some(e => e.id === newEvent.id);
            if (!exists) {
              return [newEvent, ...prev].slice(0, 50); // Keep last 50 events
            }
            return prev;
          });
        }
      },
    });

    // Cleanup function to unsubscribe
    return () => {
      unwatch();
    };
  }, [dailyGmContract, publicClient]);

  // Load past events on component mount
  useEffect(() => {
    const fetchPastEvents = async () => {
      if (!dailyGmContract || !publicClient) return;

      try {
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
        });

        const pastEvents = logs.map(log => {
          const args = log.args as unknown as { user: string; recipient: string };
          return {
            id: `${log.blockNumber}-${log.transactionIndex ?? "0"}`,
            user: args.user,
            recipient: args.recipient,
            blockNumber: log.blockNumber,
            timestamp: new Date(), // We don't have the actual timestamp from past events
          };
        });

        setEvents(prev => {
          // Merge with existing events, avoiding duplicates
          const merged = [...prev];
          for (const event of pastEvents) {
            if (!merged.some(e => e.id === event.id)) {
              merged.push(event);
            }
          }
          return merged.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)).slice(0, 50);
        });
      } catch (error) {
        console.error("Error fetching past events:", error);
      }
    };

    fetchPastEvents();
  }, [dailyGmContract, publicClient]);

  // Highlight events involving the connected address
  const isUserInvolved = (event: GMEvent) => {
    return event.user === connectedAddress || event.recipient === connectedAddress;
  };

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Recent GM Activity</h2>

      {events.length === 0 ? (
        <div className="text-center py-10 bg-base-200 rounded-xl">
          <p className="opacity-70">No GM events yet. Be the first to say GM!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className={`hover ${isUserInvolved(event) ? "bg-accent bg-opacity-10" : ""}`}>
                  <td>
                    <Address address={event.user} />
                  </td>
                  <td>
                    {event.recipient === "0x0000000000000000000000000000000000000000" ? (
                      <span className="badge badge-ghost">Everyone</span>
                    ) : (
                      <Address address={event.recipient} />
                    )}
                  </td>
                  <td>{event.timestamp.toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GMEvents;
