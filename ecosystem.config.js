module.exports = {
  apps: [
    {
      script: "server.js", // Le fichier d'entrée de votre serveur Node.js
      interpreter: "node", // Utilisation de Node.js comme interpréteur
      name: "serverNftGuessr",
      exec_mode: "cluster", // Si vous souhaitez exécuter plusieurs instances en mode cluster
      instances: 2, // Nombre d'instances à exécuter
      watch: false, // Désactivez le redémarrage automatique en cas de modification des fichiers (pour la production, vous pouvez le désactiver)
    },
  ],

  deploy: {
    production: {
      user: "ubuntu", // Nom d'utilisateur sur le serveur distant
      host: "91.134.90.80", // Adresse IP ou nom de domaine de votre serveur distant
      ref: "main", // Branche Git à déployer
      repo: "git@github.com:jecombe/server_nftguessr.git", // URL de votre dépôt Git
      path: "/home/ubuntu/server/source", // Chemin sur le serveur distant où vous souhaitez déployer l'application
      "pre-deploy-local": "", // Commande pré-déploiement locale
      "post-deploy":
        "source ~/.nvm/nvm.sh && npm install && pm2 startOrRestart ecosystem.config.js --env production", // Commandes post-déploiement
      "pre-setup": "", // Commande pré-config du serveur
      ssh_options: "PasswordAuthentication=yes", // Option pour autoriser l'authentification par mot de passe
      key: "~/.ssh/id_rsa", // Chemin vers votre clé RSA privée
      ssh_port: 22, // Port SSH
    },
  },
};
