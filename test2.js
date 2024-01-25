let dataArray = [
  {
    "0xbbd95f266f32563aa6a813469947b09ca3727bdb": {
      tokenReset: [{ id: 1, feesWin: 0 }],
      tokenIdCreated: [{ id: 1, feesWin: 0 }],
    },
  },
];

function addAddressObject(address, tokenId, feesWin, isCreated) {
  const index = dataArray.findIndex((item) => address in item);

  if (index !== -1) {
    // L'adresse existe déjà dans le tableau
    const existingAddressObject = dataArray[index][address];

    // Ajouter les informations au tableau existant
    existingAddressObject.tokenReset.push({ id: tokenId, feesWin });
    if (isCreated)
      existingAddressObject.tokenIdCreated.push({ id: tokenId, feesWin });
  } else {
    // L'adresse n'existe pas, la créer
    const newAddressObject = {
      [address]: {
        tokenReset: [{ id: tokenId, feesWin }],
        tokenIdCreated: [{ id: tokenId, feesWin }],
      },
    };

    dataArray.push(newAddressObject);
  }
}

// function deleteIdObject(address, tokenId) {
//   dataArray = dataArray.map((item) => {
//     const addressObject = item[address];

//     if (addressObject) {
//       // Si l'adresse existe, mettez à jour le tableau tokenReset
//       addressObject.tokenReset = addressObject.tokenReset.filter(
//         (token) => token.id !== tokenId
//       );
//     }

//     return item;
//   });
// }

function deleteIdObject(address, tokenId) {
  dataArray = dataArray.map((item) => {
    const addressObject = item[address];

    if (addressObject) {
      // Si l'adresse existe, mettez à jour le tableau tokenReset
      addressObject.tokenReset = addressObject.tokenReset.filter(
        (token) => token.id !== tokenId
      );

      // Si les deux tableaux sont vides, supprimez l'objet principal
      if (
        addressObject.tokenReset.length === 0 &&
        addressObject.tokenIdCreated.length === 0
      ) {
        delete item[address];
      }
    }

    return item;
  });

  // Nettoyer les objets principaux vides du tableau
  dataArray = dataArray.filter((item) => Object.keys(item).length > 0);
}

function deleteTokenId(tokenId) {
  dataArray.forEach((item) => {
    // Parcourir chaque objet dans dataArray
    const addressObject = Object.values(item)[0]; // Obtenir l'objet de l'adresse

    if (addressObject && addressObject.tokenReset) {
      // Si l'objet a un tableau tokenReset
      const tokenResetIndex = addressObject.tokenReset.findIndex(
        (token) => token.id === tokenId
      );

      if (tokenResetIndex !== -1) {
        // Si le tokenId est trouvé, le supprimer du tableau tokenReset
        addressObject.tokenReset.splice(tokenResetIndex, 1);

        // Si le tableau tokenReset est vide, supprimer l'objet principal
        // if (addressObject.tokenReset.length === 0) {
        //   delete item[Object.keys(item)[0]];
        // }
      }
    }
  });
}

function setTokenId(tokenId, player) {}

function setWinner(address, player, tokenId) {
  const r = deleteTokenId(tokenId);
  // const e = setTokenId(tokenId, player);
  // console.log(dataArray);
}

function resetTokenId(address, tokenId, tax) {
  // Vérifier si l'adresse existe déjà dans le tableau
  const addressObject = dataArray.find((item) => address in item);

  if (addressObject) {
    // Si l'adresse existe, ajouter le tokenId dans le tableau tokenReset
    addressObject[address].tokenReset.push({ id: tokenId, feesWin: tax });
  } else {
    // Si l'adresse n'existe pas, l'ajouter avec des tableaux vides
    const newAddressObject = {
      [address]: {
        tokenReset: [{ id: tokenId, feesWin: tax }],
        tokenIdCreated: [],
      },
    };

    dataArray.push(newAddressObject);
  }
}

function createdTokenId(address, tokenId, tax) {
  // Vérifier si l'adresse existe déjà dans le tableau
  const addressObject = dataArray.find((item) => address in item);

  if (addressObject) {
    // Si l'adresse existe, ajouter le tokenId dans le tableau tokenIdCreated
    addressObject[address].tokenIdCreated.push({ id: tokenId, feesWin: tax });

    // Ajouter le tokenId dans le tableau tokenReset (s'il n'existe pas déjà)
    const tokenResetIndex = addressObject[address].tokenReset.findIndex(
      (token) => token.id === tokenId
    );

    if (tokenResetIndex === -1) {
      addressObject[address].tokenReset.push({ id: tokenId, feesWin: tax });
    }
  } else {
    // Si l'adresse n'existe pas, l'ajouter avec des tableaux vides
    const newAddressObject = {
      [address]: {
        tokenReset: [{ id: tokenId, feesWin: tax }],
        tokenIdCreated: [{ id: tokenId, feesWin: tax }],
      },
    };

    dataArray.push(newAddressObject);
  }
}

// Exemple d'utilisation
const player = "0xUHBUHBUHB";
const addressToAdd = "0xbbd95f266f32563aa6a813469947b09ca3727bdb";
const tokenIdFound = 1;
const feesWinToAdd = 0;

//setWinner(addressToAdd, player, tokenIdFound);
resetTokenId(player, tokenIdFound, 1);
console.log("1", dataArray[1]);
createdTokenId(player, 2, 2);
console.log("2", dataArray[1][player]);
