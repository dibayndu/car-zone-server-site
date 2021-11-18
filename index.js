const express = require('express')
const app = express()
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const admin = require("firebase-admin");

const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});




app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fazvm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      console.log("Token", token);
      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
          console.log("User",decodeUser);
      }
      catch(err) {
        console.log(err);
      }

  }
  next();
}


async function run(){
  try{
    await client.connect();
  const database = client.db('cars_portal');
  const appointmentsCollection = database.collection('appointments');
  const usersCollection = database.collection('users');
  const productsCollection = database.collection('products');
  const orderCollecttion = database.collection('orders');

  app.get('/appointments', async (req,res)=>{
    const email = req.query.email;
    const date = new Date(req.query.date).toLocaleDateString();
    const query = {email:email, date: date}
    const cursor = appointmentsCollection.find(query);
    const appointments= await cursor.toArray();
    res.json(appointments);
  })

  app.post('/appointments', async (req, res) => {
    const appointment = req.body;
    const result = await appointmentsCollection.insertOne(appointment);
    res.json(result)
});

  //get orders
  app.post('/orders', async (req, res) => {
    const order = req.body;
    const result = await orderCollecttion.insertOne(order);
    res.json(result)
});

app.get('/products', async (req,res)=>{
  
  const cursor = productsCollection.find();
  const products= await cursor.toArray();
  res.json(products);
})
//Specific pproduct get
app.get('/products/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await productsCollection.findOne(query);
  res.json(result);
})


app.get('/users/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let isAdmin = false;
  if (user?.role === 'admin') {
      isAdmin = true;
  }
  res.json({ admin: isAdmin });
})



// get orders for specific user
app.get('/orders/:email', async (req, res) => {
  const email = req.params.email;
  console.log(email)
  const query = { email: email };
  const orders = await orderCollecttion.find(query);
  const ordersArray= await orders.toArray();
  console.log(orders);
  // let isAdmin = false;
  // if (user?.role === 'admin') {
  //     isAdmin = true;
  // }
  res.json( ordersArray);
})


app.post('/users', async (req, res) => {
  const user = req.body;
  const result = await usersCollection.insertOne(user);
  console.log(result);
  res.json(result);
});


app.put('/users', async (req, res) => {
  const user = req.body;
  const filter = { email: user.email };
  const options = { upsert: true };
  const updateDoc = { $set: user };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.json(result);
});




app.put('/users/admin', verifyToken, async (req, res) => {
  const {user,uid} = req.body;
  console.log('UID',uid);
  if (uid) {
      const requesterAccount = await usersCollection.findOne({ uid });
      if (requesterAccount.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
      }
  }
  else {
      res.status(403).json({ message: 'you do not have access to make admin' })
  }

})


 }
 finally{
//   await client.close();
 }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Cars World!')
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})



// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id')
// app.delete('/users/:id')
// users:get
//  users:post