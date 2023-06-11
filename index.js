const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hvq63b0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerCamp").collection("classes");
    const selectedClassCollection = client.db("summerCamp").collection("selectedClasses");


    // classes
    app.get('/classes', async(req,res)=>{
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    // selected class
    app.get('/selectedClasses', async(req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }
      const query = {email: email}
      const result = await selectedClassCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/selectedClasses', async(req,res)=>{
      const course = req.body;
      console.log(course)
      const result = await selectedClassCollection.insertOne(course);
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);























app.get("/", (req, res) => {
  res.send("Assignment 12");
});
app.listen(port, () => console.log(`${port}`));
