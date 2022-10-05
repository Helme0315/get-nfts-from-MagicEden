import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { programs } from "@metaplex/js";
import fs from "fs";
import { MetadataData } from "@metaplex-foundation/mpl-token-metadata";
import axios from 'axios';
import { Metaplex } from "@metaplex-foundation/js";

// import fetch from 'node-fetch';
const fetch = require('node-fetch');


const {
  metadata: { Metadata }
} = programs;

async function getListNftInfo(meSymbol: string) {
  try {
    // 👇️ const response: Response
    const apiUrl = 'https://api-mainnet.magiceden.dev/v2/collections/'+meSymbol+'/listings?offset=0&limit=1';
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error! status: ${response.status}`);
    }

    // 👇️ const result: GetUsersResponse
    const result = (await response.json());

    return result[0]['tokenMint'];
  } catch (error) {
    if (error instanceof Error) {
      console.log('error message: ', error.message);
      return error.message;
    } else {
      console.log('unexpected error: ', error);
      return 'An unexpected error occurred';
    }
  }
}

async function main() {
  const mainnet_connection = new Connection("https://api.mainnet-beta.solana.com");

  let meSymbol = process.argv.slice(2, 3)[0];
  let tokenMintAddress = await getListNftInfo(meSymbol);

  let tokenmetaPubkey = await Metadata.getPDA(new PublicKey(tokenMintAddress));

  const tokenmeta = await Metadata.load(mainnet_connection, tokenmetaPubkey);

  if(tokenmeta) {
    let creators = tokenmeta.data?.data?.creators;
    if(creators && creators.length > 0) {
      let creator;
      for(let i = 0;i<creators.length;i++) {
        if(creators[i].verified) {
          creator = creators[i].address;
          break;
        }
      }
      console.log("Creator address of NFT: ", creator)
      if(creator) {
        const metaplex_connection = new Connection("https://api.metaplex.solana.com");
        const metaplex = new Metaplex(metaplex_connection);

        console.log("=======================  Finding NFTs  ===============================")
        const nfts = await metaplex.nfts().findAllByCreator(new PublicKey(creator));
        let mintAddresses = new Set<string>();
        for(let i = 0;i< nfts.length;i++) {
          mintAddresses.add(nfts[i].mint.toString());
        }
        let mints: string[] = Array.from(mintAddresses);

        console.log(`You can find the NFT list in ${meSymbol}_mints.json`);
        fs.writeFileSync(`${meSymbol}_mints.json`, JSON.stringify(mints));

      } else {
        console.log("There isn't verfied creator");    
      }
    } else {
      console.log("Cannot find the creators of nft");  
    }
  } else {
    console.log("Cannot find the metadata of nft");
  }
  
}

main().then(() => console.log("Completed"));
