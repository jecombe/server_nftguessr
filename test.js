const { Client } = require("@googlemaps/google-maps-services-js");
const axios = require("axios");
const client = new Client({});

async function checkStreetViewImage(location) {
  try {
    const { lat, lng } = location;
    const apiKey = "AIzaSyD0ZKYS4E9Sl1izucojjOl3nErVLN2ixVQ"; // Remplacez par votre clé API Street View
    const url = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=80&heading=70&pitch=0&key=${apiKey}`;

    const response = await axios.get(url, { responseType: "arraybuffer" });
    if (response.data.length !== 4937) return true;
    return false;
  } catch (error) {
    console.error(
      "Erreur lors de la vérification de l'image Street View :",
      error
    );
    return false;
  }
}

const findNearestRoad = async (location) => {
  try {
    const response = await client.directions({
      params: {
        origin: `${location.latitude},${location.longitude}`,
        destination: `${location.latitude},${location.longitude}`,
        mode: "driving",
        key: "AIzaSyD0ZKYS4E9Sl1izucojjOl3nErVLN2ixVQ",
      },
    });

    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes[0].bounds.northeast;
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      "Erreur lors de la recherche de la route la plus proche :",
      error
    );
    return null;
  }
};

const startChecking = async (location) => {
  const nearestRoad = await findNearestRoad(location);
  if (nearestRoad) {
    // Vérifiez la disponibilité de l'image Street View
    const hasStreetViewImage = await checkStreetViewImage(nearestRoad);

    if (hasStreetViewImage) {
      return true;
    }
  }
  return false;
};

// Utilisation de la fonction findNearestRoad
module.exports = startChecking;
