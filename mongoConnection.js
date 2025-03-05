const { MongoClient, ObjectID } = require('mongodb');
require("dotenv").config();

const uri = "mongodb+srv://balpreet:ct8bCW7LDccrGAmQ@cluster0.2pwq0w2.mongodb.net/discourseDB";
             
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
        communityCollection: db.collection("communityCollection"),
        courseCollection: db.collection("courseCollection")
    };
}

module.exports = { connect, client, db, getCollections };
