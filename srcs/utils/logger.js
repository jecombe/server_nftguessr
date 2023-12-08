const log4js = require("log4js");
log4js.configure({
  appenders: {
    server: {
      type: "file",
      filename: "./logs/server.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
  },
  categories: { default: { appenders: ["server"], level: "all" } },
  debug: true, // Activez le débogage
  pm2: true,
});

const logger = log4js.getLogger();

module.exports = {
  logger,
};
