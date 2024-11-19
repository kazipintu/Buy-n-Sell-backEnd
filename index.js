const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')('sk_test_51QG2DwFqSTGgH4neymAGaA65lNsonNqWQIZdh0Gl8WYfBJHgi71tRwfPcwZg4ybVdiDBfgnmmV0nBD1MLoqchI0z00cCn03igq');
const cors = require('cors') // middleware

const app = express()
const port = 5000

// ===== middleware ===== //
app.use(cors())
app.use(express.json())

// ecomAssignment MongoDB connection
const uri = process.env.DATABASE_URL;
//console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//const userRandom = { name: "afu", email: "afu@email.com" }

async function bootstrap() {
  try {
    await client.connect();
    const database = client.db("ecomAssignment");
    const userCollection = database.collection("users");
    const furnitureCollection = database.collection("furnitureCollection");
    const scooterCollection = database.collection("scooterCollection");
    const applianceCollection = database.collection("applianceCollection");
    const bookingCollection = database.collection("bookingCollection");
    const paymentCollection = database.collection("payments");


    // ===== POST products from Front-end to db ===== //
    app.post('/products', async (req, res) => {
      const { category, ...product } = req.body;
      let result;
      if (category === "furniture") {
        const result = await furnitureCollection.insertOne({ category, ...product })
        console.log(result);
      } else if (category === "scooter") {
        const result = await scooterCollection.insertOne({ category, ...product })
        console.log(result);
      } else if (category === "appliance") {
        const result = await applianceCollection.insertOne({ category, ...product })
        //console.log(result);
      }
      res.send(result);
    })


    // ===== POST bookings ===== //
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      //console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })


    // ===== GET products from db to Front-end ===== //
    app.get('/products', async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const [furnitureResults, scooterResults, applianceResults] = await Promise.all([
        furnitureCollection.find(query).toArray(),
        scooterCollection.find(query).toArray(),
        applianceCollection.find(query).toArray(),
      ]);
      const allResults = [...furnitureResults, ...scooterResults, ...applianceResults];
      console.log(allResults);
      res.send(allResults)
    })


    // ===== GET all products from db to Front-end array ===== //
    app.get('/allProducts', async (req, res) => {
      const query = {};
      const [furnitureResults, scooterResults, applianceResults] = await Promise.all([
        furnitureCollection.find(query).toArray(),
        scooterCollection.find(query).toArray(),
        applianceCollection.find(query).toArray(),
      ]);
      const allProducts = [...furnitureResults, ...scooterResults, ...applianceResults];
      res.send(allProducts);
    })


    // ===== GET furnitureCollection from db to show in Front-end ==== //
    app.get('/availableFurnitures', async (req, res) => {
      const query = {};
      const result = await furnitureCollection.find(query).toArray();
      res.send(result)
    })


    // ===== GET scooterCollection from db to show in Front-end ==== //
    app.get('/availableScooters', async (req, res) => {
      const query = {};
      const result = await scooterCollection.find(query).toArray();
      res.send(result)
    })


    // ===== GET applianceCollection from db to show in Front-end ==== //
    app.get('/availableAppliances', async (req, res) => {
      const query = {};
      const result = await applianceCollection.find(query).toArray();
      res.send(result)
    })


    // ===== GET bookings from db to Front-end ===== //
    app.get('/bookings', async (req, res) => {
      const email = req.query.email;
      //console.log(email);
      const query = { buyerEmail: email };
      //console.log(query);
      const bookings = await bookingCollection.find(query).toArray()
      //console.log(bookings);
      res.send(bookings)
    });


    // ===== GET single booking for payment ===== //
    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking)

    });


    // ===== POST for single booking payment ===== //
    app.post('/create-payment-intent', async (req, res) => {
      const { productPrice } = req.body;

      // Convert the product price to number and calculate the amount in cents (smallest unit)
      const amount = Number(productPrice) * 100; // assuming price is in INR

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "inr", // Set currency to INR
        amount: amount,  // Amount in smallest currency unit (paise)
        payment_method_types: ["card"],   // Card as the payment method
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })


    // ===== POST payment after paying by card ===== //
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,

        }
      }
      const updatedResult = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })


    // ===== POST user from Front-end to db ===== //
    app.post('/users', async (req, res) => {
      const user = req.body;
      //console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result)
    })


    // ===== GET users from db to show in Front-end ===== //
    app.get('/users', async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result)
    })


    // ===== GET buyers from db to show in Front-end ===== //
    app.get('/buyers', async (req, res) => {
      const query = { userType: 'buyer' };
      const buyers = await userCollection.find(query).toArray();
      res.send(buyers);
    });


    // ===== GET sellers from db to show in Front-end ===== //
    app.get('/sellers', async (req, res) => {
      const query = { userType: 'seller' };
      const sellers = await userCollection.find(query).toArray();
      res.send(sellers);
    });


    // ===== GET "admin" from db to Front-end customized hook ===== //
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });


    // ===== GET "seller" from db to Front-end customized hook ===== //
    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.userType === "seller", emailVerified: user?.emailVerified });
    });


    // ===== GET "buyer" from db to Front-end customized hook ===== //
    app.get('/users/buyer/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isBuyer: user?.userType === "buyer" });
    });


    // ===== UPDATE to "Verify" sellers in db ===== //
    app.put('/sellers/:id', async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          emailVerified: true
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    })


    // ==== Delete/ Remove seller, send to db to delete from db ==== //
    app.delete('/sellers/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    })


    // ==== Delete/ Remove buyer, send to db to delete from db ==== //
    app.delete('/buyers/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    })


    // ===== DELETE products from db to Front-end ===== //
    app.delete('/allProducts/:id', async (req, res) => {
      const { id } = req.params;
      const { category } = req.query;  // Get the category from query params
      const filter = { _id: new ObjectId(id) };

      let result;
      if (category === 'furniture') {
        result = await furnitureCollection.deleteOne(filter);
      } else if (category === 'scooter') {
        result = await scooterCollection.deleteOne(filter);
      } else if (category === 'appliance') {
        result = await applianceCollection.deleteOne(filter);
        //console.log(result);
      }
      res.send(result);
    })




  } finally {

    //await client.close();
  }
}
bootstrap().catch(console.dir);

app.get('/', (req, res) => {
  res.send('E-commerce server router is working')
})

app.listen(port, () => {
  console.log(`Assignment e-commerce running on port ${port}`)
})