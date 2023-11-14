const { Client } = require("@googlemaps/google-maps-services-js");
const fs = require("fs");
const axios = require("axios");
const util = require("util");

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

// Remplacez 'YOUR_API_KEY' par votre propre clé d'API Google Maps
const googleMapsClient = require("@google/maps").createClient({
  key: "AIzaSyD0ZKYS4E9Sl1izucojjOl3nErVLN2ixVQ",
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
    console.log(error, "oooooooooooooooooooooooooooooo");
    return null;
  }
}
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
function isValidUint32Coordinates(coordinates) {
  return (
    coordinates &&
    isWithinUint32Range(coordinates.lat) &&
    isWithinUint32Range(coordinates.lng)
  );
}

function isWithinUint32Range(value) {
  const maxUint32 = 4294967295;
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maxUint32 &&
    value === Math.round(value)
  );
}

/*
Pour l'Europe de l'Ouest :

Latitude : 0 à 70 degrés (nord)
Longitude : 0 à 30 degrés (est)
Pour l'Europe du Nord :

Latitude : 50 à 70 degrés (nord)
Longitude : 0 à 30 degrés (est)
Pour l'Amérique du Nord :

Latitude : 0 à 70 degrés (nord)
Longitude : 70 à 170 degrés (ouest)
Pour l'Asie de l'Est :

Latitude : 0 à 50 degrés (nord)
Longitude : 90 à 180 degrés (est)*/

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

const checkNumber = (nb) => {
  const valueStr = value.toString();

  // Vérifier si la longueur de la chaîne dépasse la longueur maximale d'un uint32
  return valueStr.length > 10;
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

function removeCommaFromNumber(number) {
  if (typeof number === "number" || typeof number === "string") {
    // Convertir le nombre en chaîne de caractères et supprimer la virgule
    const numberString = number.toString();
    const numberWithoutComma = numberString.replace(",", "");
    return parseFloat(numberWithoutComma);
  } else {
    return null; // Gestion d'erreur si le paramètre n'est pas un nombre ou une chaîne de caractères
  }
}
function removeDecimalAndCheckUint32(coordinates) {
  const maxUint32 = 4294967295;

  // Convertir les nombres en chaînes de caractères et supprimer les virgules
  const latitudeStr = coordinates.lat.toString().replace(".", "");
  const longitudeStr = coordinates.lng.toString().replace(".", "");

  // Convertir les chaînes de caractères en nombres entiers
  const latitude = parseInt(latitudeStr);
  const longitude = parseInt(longitudeStr);

  // Vérifier si les valeurs sont dans la plage uint32
  if (
    latitude >= 0 &&
    latitude <= maxUint32 &&
    longitude >= 0 &&
    longitude <= maxUint32
  ) {
    return { lat: latitude, lng: longitude };
  } else {
    return null;
  }
}

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

async function main(nb) {
  let id = 1;
  let validLocations = [];
  let locationsToAdd = []; // Nouveau tableau pour les données à ajouter dans rajout.json

  try {
    const fileContent = await readFile(
      "./locations/validLocations.json",
      "utf8"
    );
    const existingData = JSON.parse(fileContent);

    if (existingData.length > 0) {
      const lastLocation = existingData[existingData.length - 1];
      id = lastLocation.id + 1;
      validLocations = existingData;
    }
  } catch (error) {
    console.log("File does not exist or is empty. Initializing ID to 0.");
  }

  console.log("MLLLLLLLLLLLLLL");

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
          id,
          lat: square.lat,
          lng: square.lng,
        });

        validLocations.push({
          latitude: nearestRoad.lat,
          longitude: nearestRoad.lng,
          northLat: square.northLat,
          southLat: square.southLat,
          eastLon: square.eastLon,
          westLon: square.westLon,
          tax: 0,
          id,
          lat: square.lat,
          lng: square.lng,
        });

        id++;
        i++;
        console.log(
          `Points GPS valides enregistrés : ${validLocations.length}`
        );
      } else {
        console.log("Can't find google street view in road", nearestRoad);
      }
    } else {
      // console.log("Can't find road around ", randomLocation);
    }

    await new Promise((resolve) => setTimeout(resolve, 500)); // Attendez 2 secondes
  }

  // Écriture dans le fichier validLocations.json
  await writeFile(
    "./locations/validLocations.json",
    JSON.stringify(validLocations, null, 2)
  );

  // Ajout uniquement des nouvelles données dans le fichier rajout.json
  await writeFile(
    "./locations/rajout.json",
    JSON.stringify(locationsToAdd, null, 2)
  );
}

main(5).catch((error) => {
  console.error("Une erreur s'est produite :", error);
});

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
