const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
// Créez une payload avec les données que vous souhaitez inclure dans le token
const payload = {
  userId: 123,
  username: "utilisateur123",
  // ... d'autres données
};

// Créez le token en signant la payload avec une clé secrète
const token = jwt.sign(payload, process.env.KEY);

console.log("Token créé :", token);
