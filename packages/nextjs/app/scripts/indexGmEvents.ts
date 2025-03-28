// scripts/indexGmEvents.ts
import deployedContracts from "../../contracts/deployedContracts";
import GMEvent from "../../models/GMEvent";
import dbConnect from "../../utils/mongodb";
import "dotenv/config";
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

const dailyGmContract = deployedContracts[10143]?.DailyGM;

if (!dailyGmContract) {
  throw new Error("DailyGM contract not found in deployedContracts for chain 10143");
}

// ABI for reading lastGM mapping
const lastGMAbi = parseAbiItem("function lastGM(address) view returns (uint256)");

async function indexEvents() {
  console.log("Starting GM event indexing...");

  // Connect to MongoDB
  try {
    await dbConnect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  // Get block range
  const lastIndexedBlock = (await GMEvent.findOne().sort({ blockNumber: -1 }))?.blockNumber || 7653631;
  const currentBlock = await client.getBlockNumber();
  console.log(`Last indexed block: ${lastIndexedBlock}`);
  console.log(`Current block: ${Number(currentBlock)}`);

  const BLOCK_RANGE = BigInt(100);

  if (lastIndexedBlock >= Number(currentBlock)) {
    console.log("No new blocks to index");
    process.exit(0);
  }

  console.log(`Indexing from block ${lastIndexedBlock + 1} to ${currentBlock}`);

  // Index GM events
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

      // Fetch block timestamps for accurate event timing
      const blockNumbers = [...new Set(logs.map(log => log.blockNumber).filter((bn): bn is bigint => bn !== null))];
      const blocks = await Promise.all(blockNumbers.map(blockNumber => client.getBlock({ blockNumber })));
      const blockTimestamps = new Map(blocks.map(block => [block.number, block.timestamp]));

      // Add this debugging code after creating blockTimestamps
      console.log("Sample block timestamps:");
      let i = 0;
      for (const [blockNum, timestamp] of blockTimestamps.entries()) {
        console.log(`Block ${blockNum}: ${timestamp} (${typeof timestamp})`);
        console.log(`Date: ${new Date(Number(timestamp) * 1000).toUTCString()}`);
        if (++i >= 3) break; // Just show first 3 for brevity
      }
      // And debug each event timestamp
      logs.slice(0, 3).forEach((log, i) => {
        const ts = blockTimestamps.get(log.blockNumber!);
        console.log(`Log ${i} from block ${log.blockNumber}:`);
        console.log(`- Raw timestamp: ${ts} (${typeof ts})`);
        console.log(`- Converted: ${Number(ts)}`);
        console.log(`- As date: ${new Date(Number(ts) * 1000).toUTCString()}`);
      });

      // Process logs into GMEvent documents
      const events = await Promise.all(
        logs.map(async log => {
          //   const user = (log.args as { user: string }).user.toLowerCase();
          const user = (log.args as { user: string }).user.toLowerCase() as `0x${string}`;
          const recipient = (log.args as { recipient: string }).recipient.toLowerCase();
          const blockNumber = log.blockNumber ? Number(log.blockNumber) : 0;
          const timestamp = blockTimestamps.get(log.blockNumber!) || BigInt(Math.floor(Date.now() / 1000));

          // Fetch lastGM for the user
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
        await GMEvent.insertMany(events, { ordered: false }); // unordered for performance
        console.log(`Indexed ${events.length} events from ${fromBlock} to ${toBlock}`);
      }
    } catch (error) {
      console.error(`Error indexing range ${fromBlock}-${toBlock}:`, error);
      // Continue to next range instead of failing entirely
    }
  }

  console.log("Indexing complete");
  process.exit(0);
}

indexEvents().catch(error => {
  console.error("Fatal error during indexing:", error);
  process.exit(1);
});
