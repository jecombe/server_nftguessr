const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const secretKey = "votre_clé_secrète";
const port = 8000;

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Accès refusé");

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send("Token non valide");
    req.user = user;
    next();
  });
};

// Middleware de contrôle d'autorisation
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).send("Accès refusé");
    }
  };
};

// Utilisation du middleware cors pour autoriser les requêtes CORS
app.use(cors());

// Exemple d'une route sécurisée avec authentification et autorisation
app.get(
  "/api/secure-route",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    res.json({ message: "Accès autorisé à la route sécurisée" });
  }
);

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get("/api/get-gps", (req, res) => {
  const rawData = fs.readFileSync("./locations/validLocations.json");
  const randomLocations = JSON.parse(rawData);

  const randomIndex = Math.floor(Math.random() * randomLocations.length);
  const randomCoordinates = randomLocations[randomIndex];
  console.log(randomCoordinates);

  res.json(randomCoordinates);
});
