const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const serviceAccountAuth = new JWT({
    email: "email",
    key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----\n",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function loadTable(server) {
    const doc = new GoogleSpreadsheet(
        "id",
        serviceAccountAuth
    );

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; 
    
    const serverNames = [
      "Phoenix", "Tucson", "Scottdale", "Chandler", "Brainburg", "Saint Rose",
      "Mesa", "Red Rock", "Yuma", "Surprise", "Prescott", "Glendale", "Kingman",
      "Winslow", "Payson", "Gilbert", "Show Low", "Casa-Grande", "Page", "Sun-City",
      "Queen Creek", "Sedona", "Holiday", "Wednesday", "Yava", "Faraway", "Bumble Bee", "Christmas", "Mobile 1", "Mobile 2", "Mobile 3"
    ];
    
    const activeRequests = [];
    const idleRequests = [];
    
    await sheet.loadCells();
    
    for (const server of serverNames) {
      const rowIndex = serverNames.indexOf(server) + 1; 
      const cellActive = sheet.getCell(rowIndex, 3); 
      const cellIdle = sheet.getCell(rowIndex, 2); 
      const valueActive = parseInt(cellActive.value, 10);
      const valueIdle = parseInt(cellIdle.value, 10);
      activeRequests.push(valueActive);
      idleRequests.push(valueIdle)
    }

    return [idleRequests, activeRequests];
}

module.exports = loadTable;
