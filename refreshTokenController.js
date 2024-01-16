const mongoose = require("mongoose");
var Schema = mongoose.Schema;

// this schema will follow the naming case of xero sdk: snake case
const xeroSchema = new Schema({
  id_token: {
    type: String,
  },
  access_token: {
    type: String,
  },
  expires_in: {
    type: Number,
  },
  token_type: {
    type: String,
  },
  refresh_token: {
    type: String,
  },
  scope: {
    type: String,
  },
  refresh_date:{
    type: String
  },
  source: {
    type: String // from cron job or api calling--> 
  }
});

const XeroModel = mongoose.model("xero", xeroSchema, "xero");

exports.getTokenSetFromDatabase= async ()=>{
  // let tokenSet= {}
  try{
    let x= await XeroModel.findOne({}).sort({_id: -1})

    if (x){
      // tokenSet= x
      // console.log("successfully return token from DB", x.refresh_token)
      return {
        expires_in: 1800,
        access_token: x.access_token,
        refresh_token: x.refresh_token,
        scope: x.scope
      }

    }

  }

  catch(err){
    console.log(err)
    return ""
  }

}

exports.saveTokenToDatabase = async (tokenSet) => {
  const timeElapsed = Date.now()
  let today = new Date(timeElapsed)
  
  let refreshTokenSet= new XeroModel(tokenSet)
  refreshTokenSet.refresh_date = today.toISOString()
  try{
    let x = await refreshTokenSet.save()

    if (x._id && x.refresh_token){
      return true
    }

    else{
      return false
    }

  }

  catch(err){
    console.log(err)
    return false

  }

}

exports.deleteToken = async () => {
  const timeElapsed = Date.now()
  let yesterday = new Date(timeElapsed)

  // delete token three day before
  // only keep 3 days records
  yesterday.setDate(yesterday.getDate() - 3)
  yesterday = yesterday.toISOString();


  try {
    let x = await XeroModel.deleteMany({ refresh_date: { $lt: yesterday } })

    if (x) {
      console.log(x, "successfully remove tokens from DB")
    }

  }

  catch (err) {
    console.log(err)
  }

  return "ok"

}