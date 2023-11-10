const crypto = require("crypto");
const key = crypto.randomBytes(32); // 256 bits pour une clé AES-256
const iv = crypto.randomBytes(16);
console.log("Clé hexadécimale :", key.toString("hex"));
console.log("IV hexadécimal :", iv.toString("hex"));
