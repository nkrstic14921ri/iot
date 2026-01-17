const express = require('express')
const session = require("express-session");
const PORT = 3000
const path = require('path');
const { MongoClient, ObjectId } = require("mongodb");
const uri = 'mongodb+srv://nkrstic14921ri:wi1v1KTAN@iot.mfmfc9d.mongodb.net/?appName=iot&retryWrites=true&w=majority'
const client = new MongoClient(uri, {tls: true});
const database = client.db('iot');
const app = express()

app.use(express.json())
app.use(express.static('static'), express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', './views');
app.listen(PORT)

// login form ruta
app.get("/login", (req, res) => {
    return res.send(`<html>
            <head><title>Login stranica</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script></head>
            <body style=" display: flex; align-items:center; justify-content: center;">
                <form method="post" action="/login" style="width: 300px;">
                    <h1>Login</h1>
                    <label for="username" class="form-label">Username</label>
                    <input type="text" name="username" class="form-control">
                    <br>
                    <label for="password" class="form-label">Password</label>
                    <input type="password" name="password" class="form-control">
                    <br>
                    <button class="btn btn-success">Login</button>
                    <a href="/register" class="btn btn-primary">Register</a>
                </form>
            </body>
        </html>`);
});

// login form handler
app.post("/login", async (req, res) => {
    //pokupimo username i password iz forme
    const { username, password } = req.body; //iz tela zahteva izvuce 

    const data = database.collection('users');
    const query = { username: username };
    const user = await data.findOne(query);

    if (user && user.password == password) {
        req.session.user = { username };
        return res.redirect('/uredjaji')
    }


    res.status(401).send("Invalid credentials");
});

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

//logout - briše sesiju
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// register - insert u bazu
app.get("/register", (req, res) => {
    res.send(`<html>
            <head>><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script></head>
            <body style=" display: flex; align-items:center; justify-content: center;">
                <form method="post" action="/register" style="width: 300px;">
                    <h1>Register</h1>
                    <label for="username" class="form-label">Username</label>
                    <input type="text" name="username" class="form-control">
                    <br>
                    <label for="pass" class="form-label">Password</label>
                    <input type="password" name="pass" class="form-control">
                    <br>
                    <label for="pass2" class="form-label">Repeat password</label>
                    <input type="password" name="pass2" class="form-control">
                    <br>
                    <button class="btn btn-success">Register</button>
                    <a href="/login" class="btn btn-primary">Back to login</a>
                </form>
            </body>
        </html>`)
});

app.post("/register", async (req, res) => {
    const { username, pass, pass2 } = req.body;
    //kulturna registracija je da proverimo da li je username zauzet, pa ako jeste vratimo gresku
    //a ako nije moze dalje
    const data = database.collection('users');
    const query = { username: username };
    const user = await data.findOne(query);

    if (user) {
        return res.status(400, "username taken");
    }

    //zatim proverimo da li se pass i pass2 slazu
    if (pass != pass2) {
        return res.status(400, "Passwords do not match");
    }
    //i sad je sve u redu, moze registracija
    // instert u mongodb kolekciju users
    const newUser = {
        username: username,
        password: pass,
    }
    const users = database.collection("users");
    const result = await users.insertOne(newUser);

    // ispisete poruku, ili redirektujete na login formu, ili mozete odmah i dauhvatite id i ulogujete korisnika i prebacite na dashboard
    return res.redirect('/login');
});



// Kreiranje uredjaja
app.post('/uredjaji', requireAuth, async (req, res) => {
    // Izvlacenje podataka iz tela zahteva
    const { ime, mesto, device_id, opis } = req.body

    if (!ime || !mesto || !device_id || !opis) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const device = {
            ime: req.body.ime,
            mesto: req.body.mesto,
            device_id: req.body.device_id,
            opis: req.body.opis,
            lat: req.body.lat,
            lon: req.body.lon,
            owner: req.session.user.username,
            light: parseInt(req.body.light, 10)
        }
        const devices = database.collection("devices"); //radim sa kolekciom
        const result = await devices.insertOne(device);

        const messagesData = database.collection('device_messages')
        const message = await messagesData.insertOne({ device_id: req.body.device_id, timestamp: new Date(), name: "minLight", value: parseInt(req.body.light, 10), consumed: false })
        // Preusmeravanje (redirect) na /uredjaji
        res.redirect('/uredjaji');
    } catch (error) {
        console.error("Greska ", error)
        res.status(500).json({ error: "Greska pri ubacivanju!" })
    }
})

// Prikaz svih uredjaja (pocetna stranica)
app.get('/uredjaji', requireAuth, async (req, res) => {
    try {
        // Ucitavanje uredjaja iz baze
        // trazimo u kolekciji devices
        const data = database.collection('devices');
        // trazimo uredjaje gde je vlasnik uredjaja trenutno ulogovan korisnik
        const query = { owner: req.session.user.username };
        // dohvatimo sve uredjaje kojima je vlasnik trenutno ulogovan korisnik
        const devices = await data.find(query).toArray();

        // Renderovanje devices.ejs fajla i prosledjivanje svih uredjaja
        res.render('devices', { devices });
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})

app.put('/uredjaj', requireAuth, async (req, res) => {
    try {
        delete req.body._id
        const data = database.collection('devices');
        const query = { device_id: req.body.device_id }
        const device = await data.findOne(query)

        const updatedDevice = await data.updateOne(
            { device_id: req.body.device_id },
            { $set: req.body })

        if (req.body.light !== undefined && req.body.light != device.light) {
            const messagesData = database.collection('device_messages')
            const message = await messagesData.insertOne({ device_id: req.body.device_id, timestamp: new Date(),  name: "minLight", value: req.body.light, consumed: false })
        }

        res.json(updatedDevice)
    } catch (error) {
        console.error("Greska " + error)
        res.status(500).json({ error: error })
    }
})

app.get('/device_messages', async (req, res) => {
    try {
        const device_id = req.query.device_id;

        if (!device_id) {
            return res.status(400).json({ success: false, message: "device_id query param missing" });
        }

        const data = database.collection('device_messages')
        const query = { device_id: device_id, consumed: false }
        const messages = await data.find(query).toArray();
        res.json(messages);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: error })
    }
});

app.get('/device_messages/all', requireAuth, async (req, res) => {
    try {
        const device_id = req.query.device_id;

        if (!device_id) {
            return res.status(400).json({ success: false, message: "device_id query param missing" });
        }

        const data = database.collection('device_messages')
        const query = { device_id: device_id }
        const messages = await data.find(query).toArray();
        res.json(messages);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: error })
    }
});

app.put('/device_messages', async (req, res) => {
    try {
        const message_id = req.query.id;

        if (!message_id) {
            return res.status(400).json({ success: false, message: "message id query param missing" });
        }

        const data = database.collection('device_messages')
        const message = await data.updateOne(
            { _id: new ObjectId(message_id) },
            { $set: { consumed: true } }
        );
        res.json(message);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: error })
    }
});

// Detalji u oredjaju
app.get('/uredjaj', requireAuth, async (req, res) => {
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

app.delete('/uredjaj', requireAuth, async (req, res) => {
    try {
        const dev_id = req.query.device_id
        const data = database.collection('devices');
        const query = { device_id: dev_id };
        const device = await data.deleteOne(query);
        const devices = await data.find().toArray();
        // Renderovanje device.ejs fajla i prosledjivanje uredjaja
        res.render('devices', { devices });
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
app.get('/dogadjaji', requireAuth, async (req, res) => {
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


