const log4js = require("log4js");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

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
});

const logger = log4js.getLogger();
logger.info("test");
