'use strict';

const express = require('express');
const cron = require('node-cron');
const xero_node = require('xero-node')
const xeroDatabase = require('./refreshTokenController')
require("dotenv").config();

const xero = new xero_node.XeroClient({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUris: [process.env.REDIRECT_URI],
  scopes: process.env.SCOPES.split(" ")
});

let app = express()

var mongoose = require('mongoose')
const mongoURI = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

mongoose
  .connect(mongoURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    // useFindAndModify: false,
    auth: {
      authSource: "admin"
    }
  })
  .then(() => console.log(`${process.env.MONGO_DB} connected`));
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

async function updateToken(source) {
  let isSave = false
  while (isSave != true) {
    const tokenSet = await xeroDatabase.getTokenSetFromDatabase(); // example function name
    const validTokenSet = await xero.refreshWithRefreshToken(process.env.CLIENT_ID, process.env.CLIENT_SECRET, tokenSet.refresh_token)
    validTokenSet.source = source
    isSave = await xeroDatabase.saveTokenToDatabase(validTokenSet)
    console.log(`successfully refresh token by ${source}`)
  }
}

// parameter is the source of refreshing token
// updateToken("intialization of api")

//token renew every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await updateToken("cron")
});

//token removel every 3 days 
cron.schedule('0 0 */3 * *', async () => {
  await xeroDatabase.deleteToken()
});

// function 1
app.post('/xero-proxy/invoices', async function (req, res) {
  try {
    await xero.initialize();

    const tokenSet = await xeroDatabase.getTokenSetFromDatabase(); // example function name
    await xero.setTokenSet(tokenSet);
    console.log("successfully set token", tokenSet.refresh_token)

    await updateToken("api call- invoice")
    await xero.updateTenants();

    const activeTenantId = xero.tenants[0].tenantId;

    const summarizeErrors = true;
    const unitdp = 4;
    const dateValue = '2021-10-10'
    const dueDateValue = '2021-10-28'

    const contact = {
      // sample id
      contactID: "7440ab21-e123-4cad-9721-6cee9617b1c2"
    };

    const lineItem = {
      description: "Cultivar Tray from Tower Farm",
      quantity: 1.0,
      unitAmount: 120.0,
      // accountCode: "000",
      // tracking: lineItemTrackings
    };
    const lineItems = [];
    lineItems.push(lineItem)

    const invoice = {
      type: 'ACCREC',
      contact: contact,
      date: dateValue,
      dueDate: dueDateValue,
      // lineAmountType: 'EXCLUSIVE'
      lineItems: lineItems,
      reference: "Website Design",
      // status: 'AUTHORISED'
    };

    const invoices = {
      invoices: [invoice]
    };

    try {
      const response = await xero.accountingApi.createInvoices(activeTenantId, invoices, summarizeErrors, unitdp);
      res.send(response.body || response.response.statusCode)
    } catch (err) {
      const error = JSON.stringify(err.response.body, null, 2)
      res.send(`Status Code: ${err.response.statusCode} => ${error}`);
    }

  }

  catch (err) {
    res.send(err)
  }

})


app.get('/xero-proxy/contacts', async function (req, res) {
  // let url = req.query.url

  try {
    console.log('sdssdsds', xero)
    await xero.initialize();

    const tokenSet = await xeroDatabase.getTokenSetFromDatabase(); // example function name

    await xero.setTokenSet(tokenSet);
    console.log("successfully set token", tokenSet.refresh_token)
    await updateToken("api call")
    await xero.updateTenants();

    const activeTenantId = xero.tenants[0].tenantId;

    console.log('rqtweoqwjjwqdlm')
    console.log(xero.tenants, 'heheheheheheheeh')
    try {    

      const contactList = await xero.accountingApi.getContacts(activeTenantId)
      res.send(contactList.body.contacts)
    } catch (err) {
      const error = JSON.stringify(err.response.body, null, 2)
      res.send(`Status Code: ${err.response.statusCode} => ${error}`);
    }
  }

  catch (err) {
    res.send(err);
  }
})

app.get("/xero-proxy", (req, res) => {
  res.json({ message: "Welcome to BoomGrow Xero Proxy API." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, function () {
  console.log("Your Xero basic public app is running at localhost:" + PORT)
})


