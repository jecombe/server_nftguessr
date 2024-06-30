//const dotenv = require("dotenv");

/*const { EthersClient } = require("../EthersClient");
const { Contract, Wallet, ethers } = require("ethers");

const GameAbi = require("../../abi/game.json");*/

const { Contract, Wallet, ethers } = require("ethers");
const mongoose = require('mongoose');
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const GameAbi = require("../../abi/game.json");

const { loggerServer } = require("../utils/logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();
const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");
const { createInstance } = require("fhevmjs");
const { EthersClient, getInstance, getTokenSignature } = require("../EthersClient");
const { MongoClient } = require("mongodb");
const { MongoDataBase } = require("../database/Mongo");

let _instance;

dotenv.config();
const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
console.log(process.env.PROVIDER);
dotenv.config();

class LoopSync {
    constructor() {
        this.startBlock = 0;
        this.tokenId = 0;
        this.clientNftGuessr = new EthersClient(process.env.CONTRACT, nftGuessrAbi);
        this.clientErc721 = new EthersClient(process.env.GAME, GameAbi);
        this.isStop = false;
    }

    stopLoop() {

    }

    async parseLogsContract(log) {
        if (log.name !== "createNFT") {
            console.log(log.name);
            return;
        }
        console.log(log.args);
        const tokenId = Number(log.args[1].toString())
        const winningFees = (await this.clientNftGuessr.contractInteract.winningFees(tokenId)).toString();

        // return contractSign.getNFTLocation(nftId);

        const { signature, publicKey } = await this.clientErc721.getTokenSignature(this.instance);

        const location = await this.clientErc721.contractInteract.getNFTLocation(tokenId, publicKey, signature);

        const lat = getInstance().decrypt(process.env.GAME, location[0]);
        const lng = getInstance().decrypt(process.env.GAME, location[1]);
        const parseLat = Number(lat.toString());
        const parseLng = Number(lng.toString());

        console.log(parseLat, parseLng);

        //const isReset = (await this.clientErc721.contractInteract.winningFees(tokenId)).toString();
        return {
            user: log.args[0],
            lat,
            lng,
            tokenId,
            winningFees
        }
    }

    async getCurrentBlock() {
        try {
            const blockNumber = await provider.getBlockNumber();
            console.log("Le numéro du bloc actuel est :", blockNumber);
        } catch (error) {
            console.error("Erreur lors de la récupération du bloc actuel :", error);
        }
    }

    findFirstOwner(parsedLog) {
        if (parsedLog.name === "OwnershipTransferred") {
            if (parsedLog.args[0] === "0x0000000000000000000000000000000000000000" && parsedLog.args[1] === "0xbbd95f266F32563aA6A813469947B09cA3727bdb") {
                this.isStop = true;
            }
        }
    }

    getParsedLogs(logs) {
        const iface = new ethers.utils.Interface(nftGuessrAbi);
        const parsedLogs = [];

        logs.forEach(log => {
            const parsedLog = iface.parseLog(log);
            parsedLogs.push({
                name: parsedLog.name,
                args: parsedLog.args
            })
        });
        return parsedLogs;
    }


    async processLogs(parsedLogs) {
        const nftCreate = [];
        for (const parsed of parsedLogs) {
            this.findFirstOwner(parsed);
            try {
                const parsedResult = await this.parseLogsContract(parsed);
                if (parsedResult) {
                    nftCreate.push(parsedResult);
                }
            } catch (error) {
                console.error(`Error processing parsed log: ${error}`);
            }
        }
        return nftCreate;
    }

    async updatePlayer(id, newTokenReset, newTokenIdCreated, client) {
        try {

            const database = client.db('mygame');
            const playersCollection = database.collection('players');

            const filter = { _id: id };

            const updateDoc = {
                $set: {
                    tokenReset: newTokenReset,
                    tokenIdCreated: newTokenIdCreated
                }
            };

            const result = await playersCollection.updateOne(filter, updateDoc);

            console.log(`${result.matchedCount} document(s) matched the filter criteria.`);
            console.log(`${result.modifiedCount} document(s) was/were updated.`);

        } catch (err) {
            console.error('Error updating player:', err);
        } finally {
            await client.close();
        }
    }

    // Fonction pour ajouter un nftCreation dans MongoDB
addNftCreationToMongoDB = async (holderName, nftCreationObject) => {
    try {
      // Trouver le holder existant ou le créer s'il n'existe pas
      let holder = await HolderModel.findOne({ holder: holderName });
      if (!holder) {
        holder = new HolderModel({ holder: holderName });
      }
      // Ajouter nftCreation à holder
      holder.nftsCreation.push(nftCreationObject);
      await holder.save();
      console.log('NFT Creation ajouté avec succès à MongoDB');
    } catch (err) {
      console.error('Erreur lors de l\'ajout de NFT Creation à MongoDB:', err);
    }
  };


    async start() {

        const monogo = new MongoDataBase()

        /*const Schema = mongoose.Schema;

        // Schéma MongoDB pour nftsCreation
        const NftCreationSchema = new Schema({
            id: { type: String, required: true },
            // Autres champs nécessaires peuvent être ajoutés ici
        });

        // Schéma MongoDB pour le holder
        const HolderSchema = new Schema({
            holder: { type: String, required: true },
            nfts: [{ id: String, tax: Number }],
            nftsCreation: [NftCreationSchema] // Utilisation du sous-schéma pour nftsCreation
        });

        const HolderModel = mongoose.model('Holder', HolderSchema);

        const uri = 'mongodb://localhost:27017';

        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const database = client.db('mygame');
        const playersCollection = database.collection('players');
        const newTokenReset = [
            { id: 1, feesWin: '100' },
            { id: 2, feesWin: '50' },
            { id: 4, feesWin: '75' }
        ];

        const newTokenIdCreated = [1, 2, 3, 4, 5, 9];*/

        // await this.updatePlayer("0xbbd95f266f32563aa6a813469947b09ca3727bdb", newTokenReset, newTokenIdCreated, client)
        // Insert a document into the collection
        /*const newPlayer = {
           _id: '0xbbd95f266f32563aa6a813469947b09ca3727bdb',
           tokenReset: [
             { id: 1, feesWin: '0' },
             { id: 2, feesWin: '0' },
             { id: 4, feesWin: '0' }
           ],
           tokenIdCreated: [1, 2, 3, 4]
         };
         
         //const insertResult = await playersCollection.insertOne(newPlayer);
       
         // Find all documents in the collection*/
    






        /*   await this.clientErc721.init();
   
           this.startBlock = await provider.getBlockNumber();
   
           console.log("Start fetching with", this.startBlock);
   
           while (true) {
               if (this.isStop) {
                   this.startBlock = await provider.getBlockNumber();
               }
   
               const fromBlock = Math.max(this.startBlock - 10000, 0);
   
               console.log("fetching batch block", fromBlock);
   
               const filter = {
                   address: process.env.CONTRACT,
                   fromBlock: fromBlock,
                   toBlock: this.startBlock,
               };
   
               const logs = await provider.getLogs(filter);
   
   
               const parsedLogs = this.getParsedLogs(logs)
               const nftsCreate = await this.processLogs(parsedLogs);
   
               console.log(nftsCreate);
   
   
               if (!this.isStop) this.startBlock = fromBlock;*
           }*/
    }
}



module.exports = {
    LoopSync,
};
