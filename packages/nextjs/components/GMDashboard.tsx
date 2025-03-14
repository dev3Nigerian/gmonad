"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAccount } from "wagmi";
import { ArrowRightIcon, ClockIcon, SunIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const GMDashboard = () => {
  const { address: connectedAddress } = useAccount();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [timeUntilNextGm, setTimeUntilNextGm] = useState<string | null>(null);
  const [canSayGm, setCanSayGm] = useState(false);

  // Get last GM timestamp
  const { data: lastGmTimestamp, refetch: refetchLastGm } = useScaffoldReadContract({
    contractName: "DailyGM",
    functionName: "lastGM",
    args: [connectedAddress],
  });

  // Setup contract write for general GM
  const gmWrite = useScaffoldWriteContract("DailyGM");

  // Setup contract write for directed GM
  const gmToWrite = useScaffoldWriteContract("DailyGM");

  // Calculate when user can say GM again
  useEffect(() => {
    if (lastGmTimestamp && Number(lastGmTimestamp) > 0) {
      const lastGmTime = Number(lastGmTimestamp) * 1000; // Convert to milliseconds
      const nextGmTime = lastGmTime + 24 * 60 * 60 * 1000; // Add 24 hours
      const now = Date.now();

      if (nextGmTime > now) {
        // User has to wait
        const timeRemaining = formatDistanceToNow(nextGmTime, { addSuffix: true });
        setTimeUntilNextGm(`You can say GM again ${timeRemaining}`);
        setCanSayGm(false);
      } else {
        // User can say GM
        setTimeUntilNextGm(null);
        setCanSayGm(true);
      }
    } else if (connectedAddress) {
      // No previous GM, user can say GM
      setTimeUntilNextGm(null);
      setCanSayGm(true);
    }
  }, [lastGmTimestamp, connectedAddress]);

  // Handle general GM button click
  const handleGmClick = async () => {
    if (canSayGm) {
      try {
        await gmWrite.writeContractAsync(
          {
            functionName: "gm",
          },
          {
            onSuccess: () => {
              notification.success("GM sent successfully!");
              refetchLastGm();
            },
            onError: error => {
              console.error("Error sending GM:", error);
              notification.error("Failed to send GM");
            },
          },
        );
      } catch (error) {
        console.error("Error sending GM:", error);
      }
    }
  };

  // Handle directed GM button click
  const handleGmToClick = async () => {
    if (canSayGm && recipientAddress && recipientAddress !== connectedAddress) {
      try {
        await gmToWrite.writeContractAsync(
          {
            functionName: "gmTo",
            args: [recipientAddress],
          },
          {
            onSuccess: () => {
              notification.success("GM sent successfully!");
              refetchLastGm();
              setRecipientAddress("");
            },
            onError: error => {
              console.error("Error sending GM to address:", error);
              notification.error("Failed to send GM");
            },
          },
        );
      } catch (error) {
        console.error("Error sending GM to address:", error);
      }
    } else if (recipientAddress === connectedAddress) {
      notification.error("You can't say GM to yourself!");
    } else if (!recipientAddress) {
      notification.error("Please enter a recipient address");
    }
  };

  const isLoading = gmWrite.isMining || gmToWrite.isMining;

  return (
    <div className="mt-10 w-full max-w-4xl mx-auto">
      {timeUntilNextGm && (
        <div className="mb-6 bg-orange-100 text-orange-800 p-4 rounded-lg flex items-center justify-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          <p>{timeUntilNextGm}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General GM Card */}
        <div className="flex flex-col bg-base-200 border-base-100 border-2 px-8 py-6 rounded-xl h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <SunIcon className="h-6 w-6 mr-2 text-yellow-500" />
            Say GM to Everyone
          </h2>
          <p className="mb-6 text-sm opacity-80 flex-grow">
            Send a general GM greeting to the blockchain. This will emit an event visible to everyone.
          </p>
          <button
            className={`btn btn-primary ${!canSayGm || isLoading ? "btn-disabled" : ""}`}
            onClick={handleGmClick}
            disabled={!canSayGm || isLoading}
          >
            {gmWrite.isMining ? <span className="loading loading-spinner loading-xs mr-2"></span> : null}
            Say GM to the World
          </button>
        </div>

        {/* Directed GM Card */}
        <div className="flex flex-col bg-base-200 border-base-100 border-2 px-8 py-6 rounded-xl h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ArrowRightIcon className="h-6 w-6 mr-2 text-blue-500" />
            Say GM to Someone
          </h2>
          <p className="mb-4 text-sm opacity-80">
            Send a personalized GM to a specific address. Theyll see your greeting in the blockchain events.
          </p>

          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Recipient Address</span>
            </label>
            <input
              type="text"
              placeholder="0x..."
              className="input input-bordered w-full"
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
            />
          </div>

          <button
            className={`btn btn-secondary ${!canSayGm || !recipientAddress || isLoading ? "btn-disabled" : ""}`}
            onClick={handleGmToClick}
            disabled={!canSayGm || !recipientAddress || isLoading}
          >
            {gmToWrite.isMining ? <span className="loading loading-spinner loading-xs mr-2"></span> : null}
            Say GM to This Address
          </button>
        </div>
      </div>

      {lastGmTimestamp && Number(lastGmTimestamp) > 0 && (
        <div className="mt-6 bg-base-200 p-4 rounded-lg text-sm">
          <p>Last GM sent: {new Date(Number(lastGmTimestamp) * 1000).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default GMDashboard;
