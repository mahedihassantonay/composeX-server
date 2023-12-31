const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

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
  },
});

async function run() {
  try {
    client.connect((error)=>{
     if(error){
       console.log(error)
       return;
     }
    });
    const classCollection = client.db("summerCamp").collection("classes");
    const selectedClassCollection = client
      .db("summerCamp")
      .collection("selectedClasses");
    const paymentCollection = client.db("summerCamp").collection("payment");

    const usersCollection = client.db("summerCamp").collection("users");

    // Enrolled classes
    app.get("/enrolledClasses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const enrolledClasses = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(enrolledClasses);
    });

    // users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("existing user", existingUser);
      if (existingUser) {
        return res.send({ message: "this user is already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user && user?.role === "admin" };
      res.send(result);
    });
    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user && user?.role === "instructor" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateUser = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateUser);
      res.send(result);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateUser = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateUser);
      res.send(result);
    });

    // classes
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const body = req.body;
      body.price = parseFloat(body.price);
      // console.log(body)
      const result = await classCollection.insertOne(body);
      res.send(result);
    });

    // selected class
    app.get("/selectedClasses", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/selectedClasses", async (req, res) => {
      const course = req.body;
      console.log(course);

      const filter = { _id: new ObjectId(course.classId) };
      const update = { $inc: { availableSeats: -1 } };

      const updateResult = await classCollection.updateOne(filter, update);
      console.log("Seats deducted:", updateResult.modifiedCount);

      const result = await selectedClassCollection.insertOne(course);
      res.send(result);
    });

    app.delete("/selectedClasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const amount = parseInt(price * 100);
      console.log(amount, price);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // payment related api
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: { $in: payment.courseItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await selectedClassCollection.deleteMany(query);

      res.send({ insertResult, deleteResult });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
