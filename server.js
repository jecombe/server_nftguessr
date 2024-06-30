const { LoopSync } = require("./srcs/server/LoopSync");
const { Server } = require("./srcs/server/NftGuessrSrv");

//const srv = new Server();

const test = async() => {
    const loop = new LoopSync();
    await loop.start();
}
 test()