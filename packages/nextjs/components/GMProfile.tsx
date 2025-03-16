"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import axios from "axios";
import { createPortal } from "react-dom";
import { FaDiscord, FaTwitter } from "react-icons/fa";
import { useAccount } from "wagmi";
import { UserCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { notification } from "~~/utils/scaffold-eth";

type UserProfile = {
  address: string;
  username: string;
  discordId?: string;
  discordUsername?: string;
  twitterId?: string;
  twitterUsername?: string;
  bio?: string;
};

const GMProfile = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side rendering for the portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Create a portal container when needed
  useEffect(() => {
    // When modal is opened, prevent body scrolling
    if (isProfileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileOpen]);

  // Fetch user profile from MongoDB
  useEffect(() => {
    const fetchProfile = async () => {
      if (!connectedAddress) return;

      try {
        setIsLoading(true);
        const response = await axios.get(`/api/users/${connectedAddress}`);
        if (response.data.success) {
          setProfile(response.data.data);
          setUsername(response.data.data.username || "");
          setBio(response.data.data.bio || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // If 404, user doesn't exist yet, that's fine
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [connectedAddress]);

  // Handle connecting Discord
  const connectDiscord = () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID as string;
    const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI as string;
    const scope = "identify";

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${connectedAddress}`;

    window.location.href = discordAuthUrl;
  };

  // Handle connecting Twitter
  const connectTwitter = () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    // For Twitter OAuth 1.0a, we need to start with getting a request token
    // This would typically be done via an API route
    window.location.href = `/api/auth/twitter/request?address=${connectedAddress}`;
  };

  // Save basic profile
  const saveProfile = async () => {
    if (!connectedAddress) return;

    if (!username.trim()) {
      notification.error("Username is required");
      return;
    }

    try {
      setIsLoading(true);

      const userData = {
        address: connectedAddress,
        username,
        bio,
      };

      const response = await axios.put(`/api/users/${connectedAddress}`, userData);

      if (response.data.success) {
        setProfile(response.data.data);
        setIsProfileOpen(false);
        notification.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      notification.error("Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileModal = () => {
    return (
      <div className="modal-backdrop">
        <div className="modal-container">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button className="btn btn-sm btn-circle" onClick={() => setIsProfileOpen(false)}>
                <XMarkIcon width={20} height={20} />
              </button>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Username *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-20"
                placeholder="Tell us about yourself"
                value={bio}
                onChange={e => setBio(e.target.value)}
              ></textarea>
            </div>

            <div className="divider">Connect Accounts</div>

            <div className="flex flex-col gap-3">
              <button className="btn btn-outline btn-primary" onClick={connectDiscord} disabled={isLoading}>
                <FaDiscord size={20} />
                <span className="ml-2">
                  {profile?.discordUsername ? "Update Discord Connection" : "Connect Discord"}
                </span>
              </button>

              <button className="btn btn-outline btn-accent" onClick={connectTwitter} disabled={isLoading}>
                <FaTwitter size={20} />
                <span className="ml-2">
                  {profile?.twitterUsername ? "Update Twitter Connection" : "Connect Twitter"}
                </span>
              </button>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button className="btn btn-outline" onClick={() => setIsProfileOpen(false)} disabled={isLoading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveProfile} disabled={isLoading}>
                {isLoading ? <span className="loading loading-spinner loading-xs"></span> : null}
                Save Profile
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
          }
          .modal-container {
            z-index: 100000;
            max-width: 28rem;
            width: 100%;
            margin: 1rem;
          }
          .modal-content {
            background-color: rgb(29, 34, 43); /* Grey background - you can adjust the color */
            border-radius: 0.75rem;
            box-shadow:
              0 20px 25px -5px rgb(0 0 0 / 0.1),
              0 8px 10px -6px rgb(0 0 0 / 0.1);
            padding: 1.5rem;
            color: white; /* Ensure text is visible against grey background */
          }
        `}</style>
      </div>
    );
  };

  const renderProfileInfo = () => {
    if (!profile) return null;

    return (
      <div className="ml-4 flex items-center">
        <div className="bg-base-300 rounded-lg px-3 py-1 flex items-center">
          <UserCircleIcon width={20} height={20} className="mr-2 text-primary" />
          <span className="font-bold">{profile.username}</span>
        </div>
        {profile.discordUsername && (
          <div className="ml-2 bg-indigo-100 text-indigo-800 rounded-lg px-2 py-1 flex items-center">
            <FaDiscord size={16} />
            <span className="text-xs ml-1">{profile.discordUsername}</span>
          </div>
        )}
        {profile.twitterUsername && (
          <div className="ml-2 bg-blue-100 text-blue-800 rounded-lg px-2 py-1 flex items-center">
            <FaTwitter size={16} />
            <span className="text-xs ml-1">@{profile.twitterUsername}</span>
          </div>
        )}
        <button className="ml-2 btn btn-xs btn-ghost" onClick={() => setIsProfileOpen(true)}>
          Edit
        </button>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col sm:flex-row justify-center items-center py-3 px-4 rounded-xl bg-base-200 shadow-sm">
      <div className="flex items-center">
        <ConnectButton
          showBalance={{
            smallScreen: false,
            largeScreen: true,
          }}
          chainStatus={{
            smallScreen: "icon",
            largeScreen: "full",
          }}
        />
        {isConnected && renderProfileInfo()}
      </div>

      {isConnected && !profile && !isLoading && (
        <button
          className="mt-2 sm:mt-0 sm:ml-4 btn btn-sm btn-primary flex items-center text-white"
          onClick={() => setIsProfileOpen(true)}
        >
          <UserCircleIcon width={16} height={16} className="mr-1" />
          <span>Set Up Profile</span>
        </button>
      )}

      {isLoading && !profile && (
        <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center">
          <span className="loading loading-spinner loading-sm mr-2"></span>
          <span>Loading profile...</span>
        </div>
      )}

      {isMounted && isProfileOpen && createPortal(renderProfileModal(), document.body)}
    </div>
  );
};

export default GMProfile;
