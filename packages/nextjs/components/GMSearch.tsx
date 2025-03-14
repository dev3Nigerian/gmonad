"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FaDiscord, FaTwitter } from "react-icons/fa";
import { isAddress } from "viem";
import { MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

type UserProfile = {
  address: string;
  username: string;
  discordId?: string;
  discordUsername?: string;
  twitterId?: string;
  twitterUsername?: string;
};

const GMSearch = ({ onSelectRecipient }: { onSelectRecipient: (address: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    // Debounce search
    const timer = setTimeout(async () => {
      try {
        const term = searchTerm.toLowerCase().trim();

        // Check if search term is an address
        if (isAddress(term)) {
          const response = await axios.get(`/api/users/${term}`);
          setSearchResults(response.data.success ? [response.data.data] : []);
        } else {
          // Search by username or social handles
          const response = await axios.get(`/api/users/search?q=${encodeURIComponent(term)}`);
          setSearchResults(response.data.success ? response.data.data : []);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle selecting a recipient
  const handleSelectRecipient = (address: string) => {
    onSelectRecipient(address);
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <div className="relative">
      <div className="input-group w-full">
        <span className="bg-base-300 flex items-center px-3 rounded-l-md border border-r-0 border-base-300">
          <MagnifyingGlassIcon width={20} height={20} className="text-primary" />
        </span>
        <input
          type="text"
          placeholder="Search by username, address, or social handle..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Search Results Dropdown */}
      {searchTerm && (
        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-center">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">Searching...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-3 text-center text-sm opacity-70">No users found. Try a different search term.</div>
          ) : (
            <ul>
              {searchResults.map(profile => (
                <li
                  key={profile.address}
                  className="p-2 hover:bg-base-200 cursor-pointer"
                  onClick={() => handleSelectRecipient(profile.address)}
                >
                  <div className="flex items-center">
                    <UserCircleIcon width={24} height={24} className="text-primary mr-2" />
                    <div className="flex-1">
                      <div className="font-medium">{profile.username}</div>
                      <div className="text-xs opacity-70">
                        <Address address={profile.address} />
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {profile.discordUsername && (
                        <div className="text-indigo-500">
                          <FaDiscord size={16} />
                        </div>
                      )}
                      {profile.twitterUsername && (
                        <div className="text-blue-500">
                          <FaTwitter size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GMSearch;
