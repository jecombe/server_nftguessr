function parseGoogleMapsLink(link) {
  // Trouver la partie de l'URL qui contient les coordonnées
  const match = link.match(/@([-0-9.]+),([-0-9.]+)/);

  if (match && match.length === 3) {
    // match[1] contient la latitude, match[2] contient la longitude
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      return { latitude, longitude };
    }
  }

  // Si les coordonnées ne peuvent pas être extraites, retourner null ou une valeur par défaut
  return null;
}

// Exemple d'utilisation avec votre lien
const googleMapsLink =
  "https://www.google.com/maps/@45.6260606,6.7846844,3a,75y,156.79h,90t/data=!3m7!1e1!3m5!1sJ2oF0sc1k0O-cpM_mxnglg!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fpanoid%3DJ2oF0sc1k0O-cpM_mxnglg%26cb_client%3Dmaps_sv.tactile.gps%26w%3D203%26h%3D100%26yaw%3D156.78943%26pitch%3D0%26thumbfov%3D100!7i13312!8i6656?entry=ttu";

const coordinates = parseGoogleMapsLink(googleMapsLink);

if (coordinates) {
  console.log("Latitude:", coordinates.latitude);
  console.log("Longitude:", coordinates.longitude);
} else {
  console.log("Impossible d'extraire les coordonnées depuis le lien.");
}
