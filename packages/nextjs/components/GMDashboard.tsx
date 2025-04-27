"use client";

import { useEffect, useState } from "react";
import GMSearch from "./GMSearch";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import { FaTwitter } from "react-icons/fa";
import { useAccount } from "wagmi";
import { ArrowRightIcon, ClockIcon, ShieldCheckIcon, SunIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Configurable constants
const TWITTER_REQUIRED = false; // Make Twitter optional
const GAS_LIMIT = 150000; // Reasonable gas limit
const PRIVACY_VERSION = "1.0"; // For tracking privacy consents

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
  const [privacyConsent, setPrivacyConsent] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

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

  // Check for existing privacy consent
  useEffect(() => {
    const storedConsent = localStorage.getItem("gmonad_privacy_consent");
    const storedVersion = localStorage.getItem("gmonad_privacy_version");

    if (storedConsent === "true" && storedVersion === PRIVACY_VERSION) {
      setPrivacyConsent(true);
    } else {
      setShowPrivacyModal(true);
    }
  }, []);

  // Handle privacy consent
  const handlePrivacyConsent = (consent: boolean) => {
    setPrivacyConsent(consent);
    localStorage.setItem("gmonad_privacy_consent", consent.toString());
    localStorage.setItem("gmonad_privacy_version", PRIVACY_VERSION);
    setShowPrivacyModal(false);

    if (!consent) {
      // Clear any stored data if consent is denied
      setUserProfile(null);
    }
  };

  // Fetch user profile with privacy controls
  useEffect(() => {
    const fetchProfile = async () => {
      if (!connectedAddress || !privacyConsent) return;

      try {
        setProfileLoading(true);
        const response = await axios.get(`/api/users/${connectedAddress}`, {
          headers: {
            "X-Privacy-Consent": "true", // Add consent header
          },
        });
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
  }, [connectedAddress, privacyConsent]);

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
      if (!recipientAddress || !privacyConsent) {
        setRecipientUsername("");
        setRecipientTwitter("");
        return;
      }

      try {
        const response = await axios.get(`/api/users/${recipientAddress}`, {
          headers: {
            "X-Privacy-Consent": "true", // Add consent header
          },
        });
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
  }, [recipientAddress, privacyConsent]);

  // Clear transaction parameters for clarity and security
  const getTransactionParams = () => {
    return {
      gasLimit: ethers.toBigInt(GAS_LIMIT),
      maxFeePerGas: undefined, // Let wallet decide
      maxPriorityFeePerGas: undefined, // Let wallet decide
    };
  };

  // Handle general GM button click with improved security
  const handleGmClick = async () => {
    // Twitter check is now optional based on configuration
    if (TWITTER_REQUIRED && !userProfile?.twitterUsername) {
      notification.error("You must connect your Twitter account before saying GM");
      return;
    }

    // Show transaction confirmation info
    notification.info(
      "Please confirm the transaction in your wallet. This will send a GM message to everyone on the blockchain.",
      { duration: 10000 },
    );

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
              notification.error("Transaction declined or failed");
            },
            ...getTransactionParams(), // Add explicit transaction parameters
          },
        );
      } catch (error) {
        console.error("Error sending GM:", error);
      }
    }
  };

  // Handle directed GM button click with improved security
  const handleGmToClick = async () => {
    // Twitter check is now optional based on configuration
    if (TWITTER_REQUIRED && !userProfile?.twitterUsername) {
      notification.error("You must connect your Twitter account before saying GM");
      return;
    }

    if (!recipientAddress) {
      notification.error("Please enter a recipient address");
      return;
    }

    if (recipientAddress === connectedAddress) {
      notification.error("You can't say GM to yourself!");
      return;
    }

    // Show transaction confirmation info
    notification.info(
      `Please confirm the transaction in your wallet. This will send a GM message to ${
        recipientUsername || recipientAddress
      }.`,
      { duration: 10000 },
    );

    if (canSayGm && recipientAddress) {
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
              notification.error("Transaction declined or failed");
            },
            ...getTransactionParams(), // Add explicit transaction parameters
          },
        );
      } catch (error) {
        console.error("Error sending GM to address:", error);
      }
    }
  };

  // Handle recipient selection
  const handleSelectRecipient = (address: string) => {
    setRecipientAddress(address);
  };

  // Share to Twitter with configurable text
  const shareToTwitter = () => {
    let tweetText = "";

    // More generic tweet text that doesn't hardcode Twitter handles
    if (lastGmType === "general") {
      tweetText = `I just said GM to everyone on the Monad blockchain! #GMonad`;
    } else if (lastGmType === "directed") {
      if (recipientTwitter) {
        tweetText = `I just said GM to @${recipientTwitter} on the Monad blockchain! #GMonad`;
      } else if (recipientUsername) {
        tweetText = `I just said GM to ${recipientUsername} on the Monad blockchain! #GMonad`;
      } else {
        tweetText = `I just said GM to a friend on the Monad blockchain! #GMonad`;
      }
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent("https://gmonad-pi.vercel.app/")}`;
    window.open(twitterUrl, "_blank");
  };

  const isLoading = gmWrite.isMining || gmToWrite.isMining;

  // Check if user can say GM based on all conditions
  const canSendGm = canSayGm && privacyConsent && (!TWITTER_REQUIRED || userProfile?.twitterUsername);

  return (
    <div className="mt-10 w-full max-w-4xl mx-auto">
      {/* Privacy consent modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-2 text-primary" />
              Privacy & Security Notice
            </h2>
            <div className="mb-4 text-sm">
              <p className="mb-3">GMonad values your privacy and security. Please review how we use your data:</p>
              <ul className="list-disc pl-5 mb-3 space-y-1 text-sm">
                <li>We only store your wallet address and profile information you provide.</li>
                <li>Social connections (Twitter, Discord) are optional and used only for displaying your identity.</li>
                <li>Contract interactions are limited to the specific GM functions described.</li>
                <li>No private keys or unnecessary permissions are ever requested.</li>
              </ul>
              <p>
                By clicking &quot;Accept&quot;, you consent to this data usage. You can withdraw consent at any time by
                disconnecting your wallet.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button onClick={() => handlePrivacyConsent(false)} className="btn btn-outline btn-sm">
                Decline
              </button>
              <button onClick={() => handlePrivacyConsent(true)} className="btn btn-primary btn-sm">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {profileLoading ? (
        <div className="mb-6 bg-base-200 p-4 rounded-lg flex items-center justify-center">
          <span className="loading loading-spinner loading-sm mr-2"></span>
          <p>Loading profile...</p>
        </div>
      ) : !userProfile ? (
        <div className="mb-6 bg-yellow-100 text-yellow-800 p-4 rounded-lg flex items-center justify-center">
          <p>Please set up your profile to say GM</p>
        </div>
      ) : TWITTER_REQUIRED && !userProfile.twitterUsername ? (
        <div className="mb-6 bg-red-100 text-red-800 p-4 rounded-lg flex items-center justify-center">
          <p className="font-bold">You must connect your Twitter account before saying GM</p>
        </div>
      ) : timeUntilNextGm ? (
        <div className="mb-6 bg-orange-100 text-orange-800 p-4 rounded-lg flex items-center justify-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          <p>{timeUntilNextGm}</p>
        </div>
      ) : null}

      {/* Security information banner */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg text-sm flex items-start">
        <ShieldCheckIcon className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800 dark:text-blue-300">Secure Transaction Information</p>
          <p className="mt-1 text-blue-700 dark:text-blue-400 text-xs">
            GMonad only requests blockchain transactions to record your GM messages. No signatures for personal data are
            required. All transactions are transparent and can be verified on-chain.
          </p>
        </div>
      </div>

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
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            <p>• Transaction cost: ~0.0001 MONAD</p>
            <p>• Gas limit: {GAS_LIMIT}</p>
          </div>
          <button
            className={`btn btn-primary ${!canSendGm || isLoading ? "btn-disabled" : ""}`}
            onClick={handleGmClick}
            disabled={!canSendGm || isLoading}
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

          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            <p>• Transaction cost: ~0.0001 MONAD</p>
            <p>• Gas limit: {GAS_LIMIT}</p>
          </div>

          <button
            className={`btn btn-secondary ${!canSendGm || !recipientAddress || isLoading ? "btn-disabled" : ""}`}
            onClick={handleGmToClick}
            disabled={!canSendGm || !recipientAddress || isLoading}
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
