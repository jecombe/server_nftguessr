const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const port = 8000;

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Accès non autorisé" });

  // Séparez le token de l'en-tête
  const token = authHeader.split(" ")[1];

  // Vérifiez le token
  jwt.verify(token, process.env.KEY, (err, user) => {
    if (err) {
      console.error("Erreur de vérification du token :", err);
      return res.status(403).json({ message: "Token non valide" });
    }
    req.user = user;
    next();
  });
}

// Route protégée
app.get("/api/data", authenticateToken, (req, res) => {
  res.json({ message: "Données protégées accessibles" });
});

// Endpoint pour générer un token
app.get("/api/generate-token", (req, res) => {
  const token = jwt.sign({ username: "utilisateur123" }, process.env.KEY);
  res.json({ token });
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
