const { default: axios } = require("axios");
const { logger } = require("../utils/logger");

class Map {
  constructor() {}
  async checkStreetViewImage(location) {
    try {
      const { lat, lng } = location;
      const apiKey = process.env.API_KEY_MAPS; // Remplacez par votre clé API Street View
      const url = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=80&heading=70&pitch=0&key=${apiKey}`;

      const response = await axios.get(url, { responseType: "arraybuffer" });
      if (response.data.length !== 4937) return true;
      return false;
    } catch (error) {
      logger.error(
        "Erreur lors de la vérification de l'image Street View :",
        error
      );
      return false;
    }
  }
}

module.exports = {
  Map,
};
