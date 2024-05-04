const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      const activities = ["Project created"];
      if (req?.body?.tasks?.length) {
        req?.body?.tasks?.length === 1 ? activities.unshift("1 task added in the project") : activities.unshift(`${req?.body?.tasks?.length} tasks added in the project`);
      }
      if (req?.body?.members?.length) {
        req?.body?.members?.length === 1 ? activities.unshift("1 member assigned") : activities.unshift(`${req?.body?.members?.length} members assigned in the project`);
      }

      const projects = await projectCollection.find().sort({id: -1}).toArray();
      const document = {
        id: projects.length ? projects[0]?.id + 1 : 1,
        name: req.body?.name,
        tasks: req.body?.tasks?.map(task => {
          return {
            id: new ObjectId().toString(),
            title: task,
            description: "",
            deadline: "",
            member: "",
            status: "todo"
          };
        }),
        members: req.body?.members,
        activities,
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
      const project = await projectCollection.findOne({id: parseInt(req.params?.id)});
      const activities = project?.activities;

      if (req?.body?.name && project?.name != req?.body?.name) {
        activities?.unshift("Project title updated");
      } else if (req?.body?.closed === undefined) {
        activities?.unshift("Project's members updated");
      }

      const document = {
        $set: {
          ...req.body,
          activities: activities?.slice(0, 100)
        }
      }
      const result = await projectCollection.updateOne({id: parseInt(req.params?.id)}, document);
      res.send(result);
    })

    app.delete('/projects/:id', async(req, res) => {
      const result = await projectCollection.deleteOne({id: parseInt(req.params?.id)});
      res.send(result);
    })

    app.post('/projects/:id/tasks', async(req, res) => {
      const task = {
        id: new ObjectId().toString(),
        title: req?.body?.title,
        description: "",
        deadline: "",
        member: "",
        status: req?.body?.status
      }
      const project = await projectCollection.findOne({id: parseInt(req.params?.id)});
      const activities = project?.activities;
      activities?.unshift(`'${req?.body?.title}' added`);

      const document = {
        $set: {
          tasks : [
            ...project?.tasks, task
          ],
          activities: activities?.slice(0, 100)
        }
      }
      const result = await projectCollection.updateOne({id: parseInt(req.params?.id)}, document);
      res.send({...result, addedTask: task});
    })

    app.put('/projects/:id/tasks/:tid', async(req, res) => {
      const project = await projectCollection.findOne({id: parseInt(req.params?.id)});
      let oldTask;
      project?.tasks?.forEach(item => {
        if (item?.id == req?.body?.id) return oldTask = item;
      })
      let activities = project?.activities;
      activities?.unshift(`'${req.body?.title}' updated`)
      if (req?.body?.member !== oldTask?.member) {
        activities?.unshift(`New member assigned to '${req.body?.title}'`)
      }
      if (req?.body?.status !== oldTask?.status) {
        activities?.unshift(`'${req.body?.title}' moved from ${oldTask?.status} to ${req?.body?.status}`)
      }

      const document = {
        $set: {
          tasks : project?.tasks?.map(task => {
            if (task?.id != req?.params?.tid) return task;
            else return req?.body;
          }),
          activities: activities?.slice(0, 100)
        }
      }
      const result = await projectCollection.updateOne({id: parseInt(req.params?.id)}, document);
      res.send(result);
    })

    app.delete('/projects/:id/tasks/:tid', async(req, res) => {
      const project = await projectCollection.findOne({id: parseInt(req.params?.id)});
      let rTask;
      project?.tasks?.forEach(item => {
        if (item?.id == req.params?.tid) return rTask = item;
      })

      const activities = project?.activities;
      activities?.unshift(`'${rTask?.title}' deleted`);

      const document = {
        $set: {
          tasks : project?.tasks?.filter(task => task?.id != req?.params?.tid),
          activities: activities?.slice(0, 100)
        }
      }
      const result = await projectCollection.updateOne({id: parseInt(req.params?.id)}, document);
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
