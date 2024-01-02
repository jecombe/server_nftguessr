const { Client } = require("@googlemaps/google-maps-services-js");
const fs = require("fs");
const axios = require("axios");
const util = require("util");
const path = require("path");
const { loggerScript } = require("../../srcs/utils/logger");
const rajoutLocations = path.resolve(__dirname, "../../locations/rajout.json");

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

// Remplacez 'YOUR_API_KEY' par votre propre clé d'API Google Maps
const googleMapsClient = require("@google/maps").createClient({
  key: process.env.GOOGLE_MAP_CLIENT,
  Promise: Promise,
});

async function getRandomLocation() {
  // Génère des coordonnées GPS aléatoires dans le monde entier
  const latitude = (Math.random() * 180 - 90).toFixed(6);
  const longitude = (Math.random() * 360 - 180).toFixed(6);

  return { latitude, longitude };
}

async function findNearestRoad(location) {
  // Recherche la route la plus proche pour les coordonnées données
  try {
    const rep = googleMapsClient.directions({
      origin: `${location.latitude},${location.longitude}`,
      destination: `${location.latitude},${location.longitude}`,
      mode: "driving",
    });
    const data = await rep.asPromise();
    if (data.json.routes.length > 0) {
      // Il y a au moins une route

      return data.json.routes[0].bounds.northeast;
    } else {
      // Aucune route trouvée, retourne null
      return null;
    }
  } catch (error) {
    loggerScript.log("findNearestRoad", error);
    return null;
  }
}
const checkStreetViewImage = async (location) => {
  try {
    const { lat, lng } = location;
    const apiKey = process.env.API_KEY_MAPS; // Remplacez par votre clé API Street View
    const url = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=80&heading=70&pitch=0&key=${apiKey}`;

    const response = await axios.get(url, { responseType: "arraybuffer" });
    if (response.data.length !== 4937) return true;
    return false;
  } catch (error) {
    loggerScript.error(
      "Erreur lors de la vérification de l'image Street View :",
      error
    );
    return false;
  }
};

/* *******************************************************************
For now, Zama does not handle negative integers.
So you need to use positive latitude and longitude values.
Here are the available data:

For West EU :
Latitude : 0 à 70 degrés (nord)
Longitude : 0 à 30 degrés (est)

For Noth EU:
Latitude : 50 à 70 degrés (nord)
Longitude : 0 à 30 degrés (est)

For North America:
Latitude : 0 à 70 degrés (nord)
Longitude : 70 à 170 degrés (ouest)

For East Asia:
Latitude : 0 à 50 degrés (nord)
Longitude : 90 à 180 degrés (est)
******************************************************************* */

const getRandomLocationInRegionRange32 = (minLat, maxLat, minLng, maxLng) => {
  const maxUint32 = 4294967295;

  // Génération de nombres aléatoires pour la latitude et la longitude
  const latitude = Math.random() * (maxLat - minLat) + minLat;
  const longitude = Math.random() * (maxLng - minLng) + minLng;

  // // Convertir les coordonnées en plages uint32
  // const uint32Latitude = Math.floor((latitude / 90) * maxUint32);
  // const uint32Longitude = Math.floor((longitude / 180) * maxUint32);

  // // Vérifier si les valeurs sont dans la plage uint32
  // if (
  //   uint32Latitude >= 0 &&
  //   uint32Latitude <= maxUint32 &&
  //   uint32Longitude >= 0 &&
  //   uint32Longitude <= maxUint32
  // ) {
  return { latitude, longitude };
  // } else {
  //   // Sinon, renvoyer null pour latitude et longitude
  //   return { latitude: null, longitude: null };
  // }
};

const randomGeo = () => {
  const regions = [
    { minLat: 0, maxLat: 70, minLng: 0, maxLng: 30 }, // Europe de l'Ouest
    { minLat: 50, maxLat: 70, minLng: 0, maxLng: 30 }, // Europe du Nord
    { minLat: 0, maxLat: 70, minLng: 70, maxLng: 170 }, // Amérique du Nord
    { minLat: 0, maxLat: 50, minLng: 90, maxLng: 180 }, // Asie de l'Est
  ];

  // Sélectionner aléatoirement l'une des régions
  const randomRegion = regions[Math.floor(Math.random() * regions.length)];

  // Générer des coordonnées aléatoires dans la région sélectionnée
  const randomCoordinates = getRandomLocationInRegionRange32(
    randomRegion.minLat,
    randomRegion.maxLat,
    randomRegion.minLng,
    randomRegion.maxLng
  );

  return randomCoordinates;
};

function createSquareAroundPointWithDecimals(
  latitude,
  longitude,
  distanceInKilometers
) {
  // Convertissez la distance en degrés en fonction de la latitude
  const degreesPerKilometer = 1 / 111.32; // En supposant une latitude proche de l'équateur

  // Calculez la taille du carré en degrés
  const degreesDelta = distanceInKilometers * degreesPerKilometer;

  // Coordonnées du coin nord-ouest du carré
  const northLat = latitude + degreesDelta / 2;
  const westLon = longitude - degreesDelta / 2;

  // Coordonnées du coin sud-est du carré
  const southLat = latitude - degreesDelta / 2;
  const eastLon = longitude + degreesDelta / 2;

  // Conversion en coordonnées sans décimales
  const scaledNorthLat = Math.trunc(northLat * 1e5);
  const scaledWestLon = Math.trunc(westLon * 1e5);
  const scaledSouthLat = Math.trunc(southLat * 1e5);
  const scaledEastLon = Math.trunc(eastLon * 1e5);

  return {
    northLat: scaledNorthLat,
    southLat: scaledSouthLat,
    eastLon: scaledEastLon,
    westLon: scaledWestLon,
    lat: Math.trunc(latitude * 1e5),
    lng: Math.trunc(longitude * 1e5),
  };
}

const randomLocation = async (nb) => {
  let id = 1;
  let locationsToAdd = []; // Nouveau tableau pour les données à ajouter dans rajout.json
  try {
    // const fileContent = await readFile(
    //   "./locations/validLocations.json",
    //   "utf8"
    // );
    //const existingData = JSON.parse(fileContent);

    // if (existingData.length > 0) {
    //   const lastLocation = existingData[existingData.length - 1];
    //   id = lastLocation.id + 1;
    //   validLocations = existingData;
    // }

    let i = 0;
    while (i < nb) {
      const randomLocation = randomGeo();
      const nearestRoad = await findNearestRoad(randomLocation);

      if (nearestRoad) {
        const hasStreetViewImage = await checkStreetViewImage(nearestRoad);

        if (hasStreetViewImage) {
          const square = createSquareAroundPointWithDecimals(
            nearestRoad.lat,
            nearestRoad.lng,
            5
          );

          locationsToAdd.push({
            latitude: nearestRoad.lat,
            longitude: nearestRoad.lng,
            northLat: square.northLat,
            southLat: square.southLat,
            eastLon: square.eastLon,
            westLon: square.westLon,
            tax: 0,
            id: 0,
            lat: square.lat,
            lng: square.lng,
          });

          id++;
          i++;
          loggerScript.info(
            `Points GPS valides enregistrés : ${locationsToAdd.length}`
          );
        } else {
          loggerScript.warn(
            "Can't find google street view in road",
            nearestRoad
          );
        }
      } else {
        loggerScript.warn("Can't find road around ", randomLocation);
      }

      await new Promise((resolve) => setTimeout(resolve, 500)); // Attendez 2 secondes
    }

    // Ajout uniquement des nouvelles données dans le fichier rajout.json
    await writeFile(rajoutLocations, JSON.stringify(locationsToAdd, null, 2));
  } catch (error) {
    loggerScript.fatal("randomLocation");
    return error;
  }
};

//start(2);

// main(2).catch((error) => {
//   console.error("Une erreur s'est produite :", error);
// });

// const create = async () => {
//   const lat = 41.0257788;
//   const long = 28.9742018;
//   const square = createSquareAroundPointWithDecimals(lat, long, 5);

//   const r = {
//     latitude: lat,
//     longitude: long,
//     northLat: square.northLat,
//     southLat: square.southLat,
//     eastLon: square.eastLon,
//     westLon: square.westLon,
//     tax: 0,
//     id: 6,
//     lat: square.lat,
//     lng: square.lng,
//   };

//   console.log(`Points GPS valides enregistrés`, r);
// };

// create();
module.exports = {
  checkStreetViewImage,
  randomLocation,
};
