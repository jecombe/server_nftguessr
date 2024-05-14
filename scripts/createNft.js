const { loggerScript } = require("../srcs/utils/logger");
const { randomLocation } = require("./googleMap/creationGps");
const { createNft } = require("./interactChain/SmartContract");

const startCreationNft = async (numberNFT) => {
  try {
    loggerScript.trace("start startCreationNft");
    // await randomLocation(numberNFT);
    loggerScript.trace("creation random gps point ok");
    const response = await createNft();
    loggerScript.log("Success create: ", response);
  } catch (error) {
    loggerScript.fatal("fatal error startCreationNft", error);
    return error;
  }
};

startCreationNft(1);
