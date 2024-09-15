import express from "express";
import {MongoClient} from "mongodb";
import path from 'path';
import cors from 'cors';
import {dirname} from 'path';
import { fileURLToPath } from 'url';

 const __filename = fileURLToPath(import.meta.url);
 const __dirname = dirname(__filename);
async function start() {
    const url = `mongodb+srv://fsv-server:ABCD1234@cluster0.ijiuywy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    const client = new MongoClient(url)
    await client.connect();
    const db = client.db('fsv-db');

    const app = express();
    app.use(express.json());
    app.use(cors());

    app.use('/images', express.static(path.join(__dirname, '../assets')))

    app.get('/api/products', async (req, res) => {
        const products = await db.collection('products').find({}).toArray();
        res.send(products);
    });

    async function populateCartIds(ids) {
        return Promise.all(ids.map(id => db.collection('products').findOne({id})));
    }

    app.get('/api/users/:userId/cart', async (req, res) => {
        const user = await db.collection('users').findOne({id: req.params.userId})
        const populatedCart = await populateCartIds(user?.cartItems || []);
        res.json(populatedCart);
    });

    app.get('/api/products/:productId', async (req, res) => {
        const productId = req.params.productId;
        const product = await db.collection('products').findOne({id: productId});
        res.json(product);
    });

    app.post('/api/users/:userId/cart', async (req, res) => {
        const userId = req.params.userId;
        const productId = req.body.id;

        const existingUser = await db.collection('users').findOne({id: userId});
        console.log("existingUser**************", existingUser);
        if (!existingUser) {
            await db.collection('users').insertOne({id: userId, cartItems: []});
        }
        await db.collection('users').updateOne({id: userId}, {
            $addToSet: {cartItems: productId}
        });
        const user = await db.collection('users').findOne({id: req.params.userId})
        const populatedCart = await populateCartIds(user?.cartItems || []);
        res.json(populatedCart);
    });

    app.delete('/api/users/:userId/cart/:productId', async (req, res) => {
        const userId = req.params.userId;
        const productId = req.params.productId;
        await db.collection('users').updateOne({id: userId}, {
            $pull: {cartItems: productId},
        });

        const user = await db.collection('users').findOne({id: req.params.userId})
        const populatedCart = await populateCartIds(user?.cartItems || []);
        res.json(populatedCart);
    });

    const port = process.env.PORT || 8000
    const server = app.listen(port, () => {
        console.log('Server is listening on port 8000')
    });

    server.setTimeout(120000); //set timeout to 2 minutes
}

start();

