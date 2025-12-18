const express = require('express')
const PORT = 3000
const path = require('path');
const { MongoClient } = require("mongodb");
const uri = 'mongodb+srv://nkrstic14921ri:wi1v1KTAN@iot.mfmfc9d.mongodb.net/?appName=iot'
const client = new MongoClient(uri);
const database = client.db('iot');
const app = express()

app.use(express.json())
app.use(express.static('static'), express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.set('views', './views');
app.listen(PORT)

// Kreiranje uredjaja
app.post('/uredjaji', async (req, res) => {
    // Izvlacenje podataka iz tela zahteva
    const { ime, mesto, device_id } = req.body

    if (!ime || !mesto || !device_id) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const device = {
            ime: req.body.ime,
            mesto: req.body.mesto,
            device_id: req.body.device_id,
        }
        const devices = database.collection("devices");
        const result = await devices.insertOne(device);
        // Preusmeravanje (redirect) na /uredjaji
        res.redirect('/uredjaji');
    } catch (error) {
        console.error("Greska ", error)
        res.status(500).json({ error: "Greska pri ubacivanju!" })
    }
})

// Prikaz svih uredjaja (pocetna stranica)
app.get('/uredjaji', async (req, res) => {
    try {
        // Ucitavanje uredjaja iz baze
        const data = database.collection('devices');
        const devices = await data.find().toArray();

        // Renderovanje devices.ejs fajla i prosledjivanje svih uredjaja
        res.render('devices', { devices });
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})


// Detalji u oredjaju
app.get('/uredjaj', async (req, res) => {
    try {
        const dev_id = req.query.device_id
        const data = database.collection('devices');
        const query = { device_id: dev_id };
        const device = await data.findOne(query);
        // Renderovanje device.ejs fajla i prosledjivanje uredjaja
        res.render('device', { device });
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})

// Koriste senzori za upisivanje dogadjaja
app.post('/dogadjaji', async (req, res) => {
    const { event, device_id, value } = req.body

    if (!event || !device_id || !value) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const event = {
            device_id: req.body.device_id,
            event: req.body.event,
            value: req.body.value,
            timestamp: new Date()
        }
        const events = database.collection("events");
        const result = await events.insertOne(event);
        res.status(201).json(result)
    } catch (error) {
        console.error("Greska ", error)
        res.status(500).json({ error: "Greska pri ubacivanju!" })
    }
})

// Dohvatanje dogadjaja za odredjeni uredjaj
app.get('/dogadjaji', async (req, res) => {
    try {
        const dev_id = req.query.device_id
        const data = database.collection('events');
        const query = { device_id: dev_id };
        const events = await data.find(query).toArray();
        // Dogadjaji
        res.json(events)
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})
