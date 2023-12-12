const { logger } = require("../srcs/utils/logger");
const { randomLocation } = require("./googleMap/creationGps");
const { createNft } = require("./interactChain/SmartContract");

const startCreationNft = async (numberNFT) => {
  try {
    // logger.trace("start startCreationNft");
    // await randomLocation(numberNFT);
    // logger.trace("creation random gps point ok");
    const response = await createNft();
    logger.info("creation random gps point ok", response);
    console.log(response);
  } catch (error) {
    logger.fatal("fatal error startCreationNft", error);
    console.log("ERROR CREATION NFT ", error);
  }
};

startCreationNft(1);
