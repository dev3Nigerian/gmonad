"use client";

import { useEffect, useState } from "react";
import GMSearch from "./GMSearch";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { FaTwitter } from "react-icons/fa";
import { useAccount } from "wagmi";
import { ArrowRightIcon, ClockIcon, SunIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const GMDashboard = () => {
  const { address: connectedAddress } = useAccount();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [recipientTwitter, setRecipientTwitter] = useState("");
  const [timeUntilNextGm, setTimeUntilNextGm] = useState<string | null>(null);
  const [canSayGm, setCanSayGm] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGmType, setLastGmType] = useState<"general" | "directed">("general");

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

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!connectedAddress) return;

      try {
        setProfileLoading(true);
        const response = await axios.get(`/api/users/${connectedAddress}`);
        if (response.data.success) {
          setUserProfile(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [connectedAddress]);

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

  // Fetch recipient details when address changes
  useEffect(() => {
    const fetchRecipientDetails = async () => {
      if (!recipientAddress) {
        setRecipientUsername("");
        setRecipientTwitter("");
        return;
      }

      try {
        const response = await axios.get(`/api/users/${recipientAddress}`);
        if (response.data.success) {
          setRecipientUsername(response.data.data.username || "");
          setRecipientTwitter(response.data.data.twitterUsername || "");
        } else {
          setRecipientUsername("");
          setRecipientTwitter("");
        }
      } catch (error) {
        console.error("Error fetching recipient details:", error);
        setRecipientUsername("");
        setRecipientTwitter("");
      }
    };

    fetchRecipientDetails();
  }, [recipientAddress]);

  // Handle general GM button click
  const handleGmClick = async () => {
    if (!userProfile?.twitterUsername) {
      notification.error("You must connect your Twitter account before saying GM");
      return;
    }

    if (canSayGm) {
      try {
        await gmWrite.writeContractAsync(
          {
            functionName: "gm",
          },
          {
            onSuccess: () => {
              setLastGmType("general");
              setShowSuccess(true);
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
    if (!userProfile?.twitterUsername) {
      notification.error("You must connect your Twitter account before saying GM");
      return;
    }

    if (canSayGm && recipientAddress && recipientAddress !== connectedAddress) {
      try {
        await gmToWrite.writeContractAsync(
          {
            functionName: "gmTo",
            args: [recipientAddress],
          },
          {
            onSuccess: () => {
              setLastGmType("directed");
              setShowSuccess(true);
              refetchLastGm();
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

  // Handle recipient selection
  const handleSelectRecipient = (address: string) => {
    setRecipientAddress(address);
  };

  // Share to Twitter
  const shareToTwitter = () => {
    let tweetText = "";

    if (lastGmType === "general") {
      tweetText = `I just said GM to everyone on the Monad blockchain! #GMONAD #MonadBlockchain`;
    } else if (lastGmType === "directed") {
      if (recipientTwitter) {
        tweetText = `I just said GM to @${recipientTwitter} on the Monad blockchain! #GMONAD #MonadBlockchain`;
      } else if (recipientUsername) {
        tweetText = `I just said GM to ${recipientUsername} on the Monad blockchain! #GMONAD #MonadBlockchain`;
      } else {
        tweetText = `I just said GM to someone special on the Monad blockchain! #GMONAD #MonadBlockchain`;
      }
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent("https://gmonad-pi.vercel.app/")}`;
    window.open(twitterUrl, "_blank");
  };

  const isLoading = gmWrite.isMining || gmToWrite.isMining;

  return (
    <div className="mt-10 w-full max-w-4xl mx-auto">
      {profileLoading ? (
        <div className="mb-6 bg-base-200 p-4 rounded-lg flex items-center justify-center">
          <span className="loading loading-spinner loading-sm mr-2"></span>
          <p>Loading profile...</p>
        </div>
      ) : !userProfile ? (
        <div className="mb-6 bg-yellow-100 text-yellow-800 p-4 rounded-lg flex items-center justify-center">
          <p>Please set up your profile to say GM</p>
        </div>
      ) : !userProfile.twitterUsername ? (
        <div className="mb-6 bg-red-100 text-red-800 p-4 rounded-lg flex items-center justify-center">
          <p className="font-bold">You must connect your Twitter account before saying GM</p>
        </div>
      ) : timeUntilNextGm ? (
        <div className="mb-6 bg-orange-100 text-orange-800 p-4 rounded-lg flex items-center justify-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          <p>{timeUntilNextGm}</p>
        </div>
      ) : null}

      {showSuccess && (
        <div className="mb-6 bg-green-100 text-green-800 p-6 rounded-lg">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold mb-2">🎉 GM Successfully Sent! 🎉</h3>
            <p className="mb-4">Your GM has been recorded on the Monad blockchain.</p>
            <button
              onClick={shareToTwitter}
              className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none"
            >
              <FaTwitter className="mr-2" />
              Share on Twitter
            </button>
          </div>
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
            className={`btn btn-primary ${
              !canSayGm || isLoading || !userProfile?.twitterUsername ? "btn-disabled" : ""
            }`}
            onClick={handleGmClick}
            disabled={!canSayGm || isLoading || !userProfile?.twitterUsername}
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
            Send a personalized GM to a specific address. They&apos;ll see your greeting in the blockchain events.
          </p>

          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Find Recipients</span>
            </label>
            <GMSearch onSelectRecipient={handleSelectRecipient} />
          </div>

          {recipientAddress && (
            <div className="mb-4 p-2 bg-base-300 rounded-lg">
              <p className="text-sm">Recipient: {recipientUsername || "Unknown"}</p>
              {recipientTwitter && (
                <p className="text-xs text-blue-500">
                  <FaTwitter className="inline mr-1" />@{recipientTwitter}
                </p>
              )}
            </div>
          )}

          <button
            className={`btn btn-secondary ${
              !canSayGm || !recipientAddress || isLoading || !userProfile?.twitterUsername ? "btn-disabled" : ""
            }`}
            onClick={handleGmToClick}
            disabled={!canSayGm || !recipientAddress || isLoading || !userProfile?.twitterUsername}
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
