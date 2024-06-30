//const dotenv = require("dotenv");

/*const { EthersClient } = require("../EthersClient");
const { Contract, Wallet, ethers } = require("ethers");

const GameAbi = require("../../abi/game.json");*/

const mongoose = require('mongoose');
const dotenv = require("dotenv");

const { loggerServer } = require("../utils/logger");
const { MongoClient } = require("mongodb");
const Schema = mongoose.Schema;

let _instance;

dotenv.config();

class MongoDataBase {
    constructor() {
        this.HolderModel = mongoose.model('Holder', this.getSchemaHolder());
        this.NftModel = mongoose.model('Nft', this.getSchemaNft()); // Ajouter le modèle NFT
        this.start()
    }
   // Fonction pour ajouter un NFT
   async addNft(id, latitude, longitude) {
    try {
        const existingHolder = await this.NftModel.findOne({ id });
        if (existingHolder) {
          console.error(`Le holder ${id} existe déjà.`);
          return;
        }
  
        const newHolder = new this.NftModel({
          id,
          latitude, // Initialisation avec un tableau vide
          longitude,
          active: true // Initialisation avec un tableau vide
        });
  
        await newHolder.save();
        console.log(`Holder ${id} ajouté avec succès à MongoDB`);
      } catch (err) {
        console.error(`Erreur lors de l'ajout du holder ${id} à MongoDB :`, err);
      }
}

    // Schéma pour NFT
    getSchemaNft() {
        return new Schema({
            id: { type: String, required: true },
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
            active: { type: Boolean, required: true }
        });
    }
    // Fonction pour ajouter un nftCreation dans MongoDB
    async addNftCreationToMongoDB(holderName, nftCreationObject) {
        try {
            let holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                holder = new this.HolderModel({ holder: holderName });
            }
            holder.nftsCreation.push(nftCreationObject);
            await holder.save();
            console.log('NFT Creation ajouté avec succès à MongoDB');
        } catch (err) {
            console.error('Erreur lors de l\'ajout de NFT Creation à MongoDB:', err);
        }
    }

    async addHolder(holderName) {
        try {
          const existingHolder = await this.HolderModel.findOne({ holder: holderName });
          if (existingHolder) {
            console.error(`Le holder ${holderName} existe déjà.`);
            return;
          }
    
          const newHolder = new this.HolderModel({
            holder: holderName,
            nfts: [], // Initialisation avec un tableau vide
            nftsCreation: [] // Initialisation avec un tableau vide
          });
    
          await newHolder.save();
          console.log(`Holder ${holderName} ajouté avec succès à MongoDB`);
        } catch (err) {
          console.error(`Erreur lors de l'ajout du holder ${holderName} à MongoDB :`, err);
        }
      }

    // Fonction pour supprimer un nftCreation d'un holder
    async removeNftCreationFromHolder(holderName, nftCreationId) {
        try {
            let holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                console.error(`Holder ${holderName} non trouvé.`);
                return;
            }
            holder.nftsCreation = holder.nftsCreation.filter(nft => nft.id !== nftCreationId);
            await holder.save();
            console.log(`NFT Creation avec l'ID ${nftCreationId} supprimé avec succès du holder ${holderName}`);
        } catch (err) {
            console.error(`Erreur lors de la suppression de NFT Creation avec l'ID ${nftCreationId} du holder ${holderName}:`, err);
        }
    }

    // Fonction pour ajouter un nft à un holder
    async addNftToHolder(holderName, nftObject) {
        try {
            let holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                console.error(`Holder ${holderName} non trouvé.`);
                return;
            }
            holder.nfts.push(nftObject);
            await holder.save();
            console.log(`NFT avec l'ID ${nftObject.id} ajouté avec succès au holder ${holderName}`);
        } catch (err) {
            console.error(`Erreur lors de l'ajout de NFT au holder ${holderName}:`, err);
        }
    }

     // Fonction pour changer le statut 'active' d'un NFT par ID
     async updateNftActiveStatus(nftId, newStatus) {
        try {
            const nft = await this.NftModel.findOne({ id: nftId });
            if (!nft) {
                console.error(`NFT avec l'ID ${nftId} non trouvé.`);
                return;
            }
            nft.active = newStatus;
            await nft.save();
            console.log(`Statut 'active' du NFT avec l'ID ${nftId} mis à jour avec succès à ${newStatus}`);
        } catch (err) {
            console.error(`Erreur lors de la mise à jour du statut 'active' du NFT avec l'ID ${nftId}:`, err);
        }
    }


    // Fonction pour supprimer un nft d'un holder
    async removeNftFromHolder(holderName, nftId) {
        try {
            let holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                console.error(`Holder ${holderName} non trouvé.`);
                return;
            }
            holder.nfts = holder.nfts.filter(nft => nft.id !== nftId);
            await holder.save();
            console.log(`NFT avec l'ID ${nftId} supprimé avec succès du holder ${holderName}`);
        } catch (err) {
            console.error(`Erreur lors de la suppression de NFT du holder ${holderName}:`, err);
        }
    }

    getSchemaCreation() {
        // Schéma MongoDB pour nftsCreation
        return new Schema({
            id: { type: String, required: true },
            // Autres champs nécessaires peuvent être ajoutés ici
        });
    }

    getSchemaHolder() {
        const NftCreationSchema = this.getSchemaCreation();
        // Schéma MongoDB pour nftsCreation
        return new Schema({
            holder: { type: String, required: true },
            nfts: [{ id: String, tax: Number }],
            nftsCreation: [NftCreationSchema] // Utilisation du sous-schéma pour nftsCreation
        });

    }

    // Fonction pour ajouter un nftCreation dans MongoDB
    async addNftCreationToMongoDB(holderName, nftCreationObject) {
        try {
            // Trouver le holder existant ou le créer s'il n'existe pas
            let holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                holder = new this.HolderModel({ holder: holderName });
            }
            // Ajouter nftCreation à holder
            holder.nftsCreation.push(nftCreationObject);
            await holder.save();
            console.log('NFT Creation ajouté avec succès à MongoDB');
        } catch (err) {
            console.error('Erreur lors de l\'ajout de NFT Creation à MongoDB:', err);
        }
    };

    // Fonction pour récupérer tous les holders
  async getAllHolders() {
    try {
      const holders = await this.HolderModel.find({});
      return holders;
    } catch (error) {
      console.error('Erreur lors de la récupération des holders :', error);
      return [];
    }
  }

      // Fonction pour mettre à jour la taxe d'un NFT par holder et ID
      async updateNftTax(holderName, nftId, newTax) {
        try {
            const holder = await this.HolderModel.findOne({ holder: holderName });
            if (!holder) {
                console.error(`Holder ${holderName} non trouvé.`);
                return;
            }

            const nft = holder.nfts.find(nft => nft.id === nftId);
            if (!nft) {
                console.error(`NFT avec l'ID ${nftId} non trouvé pour le holder ${holderName}.`);
                return;
            }

            nft.tax = newTax;
            await holder.save();
            console.log(`Taxe du NFT avec l'ID ${nftId} mise à jour avec succès pour le holder ${holderName}`);
        } catch (err) {
            console.error(`Erreur lors de la mise à jour de la taxe du NFT avec l'ID ${nftId} pour le holder ${holderName}:`, err);
        }
    }



     // Fonction pour récupérer tous les holders
     async getAllNft() {
        try {
          const nfts = await this.NftModel.find({});
          return nfts;
        } catch (error) {
          console.error('Erreur lors de la récupération des holders :', error);
          return [];
        }
      }

  // Fonction pour trouver un holder par son nom
  async findHolderByName(holderName) {
    try {
      const holder = await this.HolderModel.findOne({ holder: holderName });
      return holder;
    } catch (error) {
      console.error(`Erreur lors de la recherche du holder ${holderName} :`, error);
      return null;
    }
  }

    async start() {


        const uri = 'mongodb://localhost:27017';

        // Connexion à MongoDB (remplacer avec votre URI de connexion MongoDB)
        mongoose.connect('mongodb://localhost:27017', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

      /*  await this.addNftCreationToMongoDB(`users`, { id: `${5}` });
        await this.addNftToHolder(`users`, { id: `${5}`, tax:`${0.1}`});
        await this.addNft(5, 121212, 3232323232);*/

        //await this.addNft(1, 9, 10);

        /*this.addNftCreationToMongoDB('Holder 1', { id: 'NFT9' });
        this.removeNftCreationFromHolder('Holder 1', 'NFT9');
        
        this.addNftToHolder('Holder 1', { id: 'NFT10', tax: 0.15 });
        this.removeNftFromHolder('Holder 1', 'NFT10');*/
        
        const allHolders = await this.getAllHolders();
        console.log('Tous les holders :', allHolders);
        
        /* const specificHolder = await this.findHolderByName('Holder 1');
        console.log('Holder spécifique :', specificHolder);*/

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
    MongoDataBase,
};
