const express = require('express');
const redis = require("redis");

const app = express();
const port = process.env.PORT || 3000;

// Initialize Redis client properly
const client = redis.createClient();

client.on("error", (err) => {
    console.error(`Redis Error: ${err?.message ? err?.message : err}`);
});

// Ensure Redis connects before using it
(async () => {
    try {
        await client.connect();
        console.log("✅ Connected to Redis successfully!");
    } catch (err) {
        console.error(`🚨 Redis Connection Error: ${err.message}`);
        process.exit(1); // Stop the server if Redis is not connected
    }
})();

app.use(express.json());

const baseUrl = "https://swapi.dev/api/people/";

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/person/:id', async (req, res) => {
    const { id } = req.params
    let url = baseUrl
    if (id) {
        url = baseUrl + id + "/"
    }
    try {
        const cachedData = await client.get(url);
        if (cachedData) {
            console.log("✅ Cache hit!");
            return res.json(JSON.parse(cachedData));
        }

        console.log("🚀 Cache miss! Fetching from API...");
        const response = await fetch(url).then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        }
        );
        if (!response || !response.data) {
            throw new Error('Invalid response from API');
        }
        console.log("✅ Data fetched from API!");

        // Store the response in Redis with an expiration time of 1 hour
        await client.setEx(url, 60 * 60, JSON.stringify(response.data));

        res.json(response.data);
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        res.status(500).send('Error fetching data');
    }
});

app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
