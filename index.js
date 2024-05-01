const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("pro-man");
    const projectCollection = database.collection("projects");

    app.get('/projects', async(req, res) => {
      const result = await projectCollection.find().toArray();
      res.send(result);
    })

    app.post('/projects', async(req, res) => {
      const projects = await projectCollection.find().sort({id: -1}).toArray();
      const document = {
        id: projects.length ? projects[0]?.id + 1 : 1,
        name: req.body?.name,
        toDo: req.body?.toDo,
        doing: [],
        done: [],
        members: req.body?.members,
        activities: [],
        closed: false
      }
      const result = await projectCollection.insertOne(document);
      res.send(result);
    })

    app.get('/projects/:id', async(req, res) => {
      const result = await projectCollection.findOne({id: parseInt(req.params?.id)});
      res.send(result);
    })

    app.put('/projects/:id', async(req, res) => {
      const document = {
        $set: req.body
      }
      const result = await projectCollection.updateOne({id: parseInt(req.params?.id)}, document);
      res.send(result);
    })

    app.delete('/projects/:id', async(req, res) => {
      const result = await projectCollection.deleteOne({id: parseInt(req.params?.id)});
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Database connected!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to ProMan's Server!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
});

module.exports = app;
