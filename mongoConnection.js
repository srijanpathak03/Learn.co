const { MongoClient, ObjectID } = require('mongodb');
require("dotenv").config();

const uri = process.env.MONGODB_URI;
             
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true,  
  });
  let db;

async function connect() {
    try {
        await client.connect();  
        db = client.db(); 
    } catch (error) {
        console.error("Connection to MongoDB failed:", error);
        throw error; 
    }
    return db;
}

async function getDb() {
    if (!db) {
        await connect();
    }
    return db;
}

async function getCollections() {
    const db = await getDb();
    return {
        communityCollection: db.collection("communityCollection")
    };
}

module.exports = { connect, client, db, getCollections };
