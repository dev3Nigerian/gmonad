// pages/api/index-gm-events.ts
import deployedContracts from "../../../contracts/externalContracts";
import GMEvent from "../../../models/GMEvent";
import dbConnect from "../../../utils/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http, parseAbiItem } from "viem";
import { defineChain } from "viem";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
});

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const typedDeployedContracts = deployedContracts as {
  [chainId: number]: { [contractName: string]: { address: `0x${string}`; abi: any[] } };
};
const dailyGmContract = typedDeployedContracts[10143]?.DailyGM;
// const dailyGmContract = deployedContracts[10143]?.DailyGM;

if (!dailyGmContract) {
  throw new Error("DailyGM contract not found in deployedContracts for chain 10143");
}

const lastGMAbi = parseAbiItem("function lastGM(address) view returns (uint256)");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Starting GM event indexing...");

  try {
    await dbConnect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    return res.status(500).json({ success: false, error: "MongoDB connection failed" });
  }

  const lastIndexedBlock = (await GMEvent.findOne().sort({ blockNumber: -1 }))?.blockNumber || 7653631;
  const currentBlock = await client.getBlockNumber();
  console.log(`Last indexed block: ${lastIndexedBlock}`);
  console.log(`Current block: ${Number(currentBlock)}`);

  const BLOCK_RANGE = BigInt(100);

  if (lastIndexedBlock >= Number(currentBlock)) {
    console.log("No new blocks to index");
    return res.status(200).json({ success: true, message: "No new blocks" });
  }

  console.log(`Indexing from block ${lastIndexedBlock + 1} to ${currentBlock}`);

  for (let fromBlock = BigInt(lastIndexedBlock + 1); fromBlock <= currentBlock; fromBlock += BLOCK_RANGE) {
    const toBlock =
      fromBlock + BLOCK_RANGE - BigInt(1) > currentBlock ? currentBlock : fromBlock + BLOCK_RANGE - BigInt(1);

    try {
      console.log(`Fetching GM events from ${Number(fromBlock)} to ${Number(toBlock)}`);
      const logs = await client.getLogs({
        address: dailyGmContract.address,
        event: parseAbiItem("event GM(address indexed user, address indexed recipient)"),
        fromBlock,
        toBlock,
      });

      console.log(`Found ${logs.length} GM events in range ${Number(fromBlock)}-${Number(toBlock)}`);

      if (logs.length === 0) {
        console.log("No events in this range");
        continue;
      }

      const blockNumbers = [...new Set(logs.map(log => log.blockNumber).filter((bn): bn is bigint => bn !== null))];
      const blocks = await Promise.all(blockNumbers.map(blockNumber => client.getBlock({ blockNumber })));
      const blockTimestamps = new Map(blocks.map(block => [block.number, block.timestamp]));

      const events = await Promise.all(
        logs.map(async log => {
          const user = (log.args as { user: string }).user.toLowerCase() as `0x${string}`;
          const recipient = (log.args as { recipient: string }).recipient.toLowerCase() as `0x${string}`;
          const blockNumber = log.blockNumber ? Number(log.blockNumber) : 0;
          const timestamp = blockTimestamps.get(log.blockNumber!) || BigInt(Math.floor(Date.now() / 1000));

          const lastGM = await client.readContract({
            address: dailyGmContract.address,
            abi: [lastGMAbi],
            functionName: "lastGM",
            args: [user],
          });

          return {
            user,
            recipient,
            blockNumber,
            timestamp: Number(timestamp),
            lastGM: Number(lastGM),
          };
        }),
      );

      if (events.length > 0) {
        console.log(`Inserting ${events.length} events into MongoDB...`);
        await GMEvent.insertMany(events, { ordered: false });
        console.log(`Indexed ${events.length} events from ${fromBlock} to ${toBlock}`);
      }
    } catch (error) {
      console.error(`Error indexing range ${fromBlock}-${toBlock}:`, error);
    }
  }

  console.log("Indexing complete for this run");
  res.status(200).json({ success: true, message: "Indexing complete" });
}
