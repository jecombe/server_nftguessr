const log4js = require("log4js");
log4js.configure({
  appenders: {
    server: {
      type: "file",
      filename: "./logs/server.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
    script: {
      type: "file",
      filename: "./logs/script.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
  },
  categories: {
    default: { appenders: ["server"], level: "all" },
    script: { appenders: ["script"], level: "all" },
  },
  debug: true, // Activez le débogage
  pm2: true,
});

const loggerServer = log4js.getLogger("server");
const loggerScript = log4js.getLogger("script");

module.exports = {
  loggerServer,
  loggerScript,
};
