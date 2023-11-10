const log4js = require("log4js");

log4js.configure({
  appenders: {
    server: {
      type: "file",
      filename: "./server.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
  },
  categories: { default: { appenders: ["server"], level: "all" } },
});

module.exports = { log4js };
