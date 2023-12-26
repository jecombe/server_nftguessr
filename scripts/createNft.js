const { loggerScript } = require("../srcs/utils/logger");
const { randomLocation } = require("./googleMap/creationGps");
const { createNft } = require("./interactChain/SmartContract");

const startCreationNft = async (numberNFT, chain) => {
  try {
    // loggerScript.trace("start startCreationNft");
    // await randomLocation(numberNFT);
    // loggerScript.trace("creation random gps point ok");
    const response = await createNft(chain);
    loggerScript.info("Success create: ", response);
  } catch (error) {
    loggerScript.fatal("fatal error startCreationNft", error);
    return error;
  }
};

startCreationNft(1, "inco");
