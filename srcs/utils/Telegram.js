const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");
const { logger } = require("./logger");
dotenv.config();

class Telegram {
  constructor(utiles, nftGuessr) {
    this.nftGuessr = nftGuessr;
    this.isDev = process.env.IS_DEV;
    if (!this.idDev) {
      this.bot_log = new TelegramBot(process.env.TELEGRAM_BOT_LOG_TOKEN, {
        polling: false,
      });
      this.bot_user = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: true,
      });
    }
    this.utiles = utiles;
    if (!this.isDev) {
      this.startMessage();
      this.listeningMessages();
    }
  }

  sendMessageLog(message) {
    this.bot_log.sendMessage(
      process.env.TELEGRAM_CHAT_ID_LOG,
      JSON.stringify(message)
    );
  }

  sendMessageGroup(message) {
    this.bot_user.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      JSON.stringify(message)
    );
  }

  startMessage() {
    this.bot_user.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;

      // Créer un clavier personnalisé
      const keyboard = {
        resize_keyboard: true,
        keyboard: [["get rules"], ["get stats"], ["help"]],
        one_time_keyboard: true,
      };

      // Envoyer un message d'introduction avec le clavier personnalisé
      const message = `🌐 **Welcome to NFTGuessr Bot!** 🌐
          "With this, you can get rules and all informations about the game.",
          `;
      this.bot_user.sendMessage(chatId, message, {
        reply_markup: JSON.stringify(keyboard),
      });
    });
  }
  async manageInfos(chatId) {
    try {
      const fees = await this.nftGuessr.getFees();
      const minimumStake = await this.nftGuessr.getNbStake();
      const totalNfts = await this.nftGuessr.getTotalNft();
      const feeLisible = Math.round(this.utiles.convertWeiToEth(fees));
      const message = `
      💎 GeoSpace total:${totalNfts}\n 💸 Minimum fees to guess: ${feeLisible} ZAMA\n🔓 Minimum GeoSpace hold to access creation: ${minimumStake}`;
      this.bot_user.sendMessage(chatId, message);
    } catch (error) {
      logger.fatal("manageInfos", error);
    }
  }

  async listeningMessages() {
    // Écouter les réponses de l'utilisateur
    this.bot_user.on("message", async (msg) => {
      const chatId = msg.chat.id;

      // Vérifier le texte du message
      switch (msg.text) {
        case "get rules":
          // Gérer la commande 1
          const message = `
          NFTGuessr is a thrilling game inspired by GeoGuessr. The concept is simple: pinpoint the location in Google Street View. Powered by EVM on Zama, each location is tied to an NFT encrypted with Fully Homomorphic Encryption (FHE).
          
          🔍 **How to Play:**
          1. Pay 1 Zama to inquire if your location guess is correct (within the 5 km² radius of the NFT location).
          2. If correct, you win the associated NFT!
          
          💡 **Options for Winners:**
          - **Option 1:** Put the NFT back into play with your tax for one round.
          - **Option 2:** Accumulate 3 NFTs, stake them, and unlock the ability to create new NFTs with GPS coordinates, including your tax.
          
          🚀 **Ready to play? Dive into the NFTGuessr adventure!**
          
          📌 *Note: Make sure to join our Telegram group for updates and discussions! [Telegram Group Link]*
          
          Happy Guessing! 🌍🎮
          `;
          this.bot_user.sendMessage(chatId, message);
          break;
        case "get stats":
          // Gérer la commande 2
          //this.bot_user.sendMessage(chatId, "rr");

          await this.manageInfos(chatId);
          break;
        case "help":
          const msg = `🌐 **Welcome to NFTGuessr Bot!** 🌐
          "With this, you can get rules and all informations about the game.",
          `;
          this.bot_user.sendMessage(chatId, msg);
          break;
        default:
      }
    });
  }
}

module.exports = {
  Telegram,
};
