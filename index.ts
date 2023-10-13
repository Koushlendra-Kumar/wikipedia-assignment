import express, {Request, Response, Application} from 'express';
import {MongoClient, ServerApiVersion } from 'mongodb';
import {config} from 'dotenv';
import Wiki from 'wikijs';

config();

const app: Application = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req:Request, res:Response) => {
  res.send('GET - /api/wikipedia?query=word');
});

const uri: string | undefined = process.env.MONGODB_URI;

if (!uri) {
    console.error("MONGODB_URI is not defined in the environment.");
    process.exit(1);
}

type Article = {
    title: string,
    summary: string,
    originalImage: string
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const wikiCollection = client.db("wikipediaDB").collection("articles");
    console.log("successfully connected to MongoDB!");

    app.get('/api/wikipedia', async (req:Request, res:Response) => {
        const queryWord: string | any = req.query.query;
      const result = await wikiCollection.find({ title: queryWord }).toArray();
      if(result?.length === 0) {
        const wiki = Wiki();
        const article = await wiki.page(queryWord);
        const summary = await article.summary();
        const originalImage = await article.mainImage();
        const data : Article = {
            title: queryWord,
            summary: summary,
            originalImage: originalImage
        }
        await wikiCollection.insertOne(data);
        res.send(data);
      }
      else {
        res.send(result[0]);
      }
    });
} catch(error){
    console.log(error);
}
   
}
run().catch(console.dir);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})