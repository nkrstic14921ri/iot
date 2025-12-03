const express = require('express')
const app = express()
const PORT = 3000
const path = require('path');
const { Pool } = require('pg')

app.use(express.json())
app.use(express.static('static'), express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.set('views', './views');

const pool = new Pool({ connectionString: "postgresql://sleep_smart_rpfo_user:I99RPr3T1etJu0XxKFfbdvTPjxFCOoVp@dpg-d4o09v75r7bs73cb972g-a.oregon-postgres.render.com/sleep_smart_rpfo", ssl: { rejectUnauthorized: false } })

async function createTable() {
    const query = `CREATE TABLE IF NOT EXISTS dogadjaji(
    id SERIAL PRIMARY KEY,
    tip VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    identifikatorUredjaja VARCHAR(50) NOT NULL,
    vrednost VARCHAR(20) NOT NULL);`

    const devicesQuery = `CREATE TABLE IF NOT EXISTS uredjaji(
        id SERIAL PRIMARY KEY,
        ime VARCHAR(50) NOT NULL,
        device_id VARCHAR(50) NOT NULL
    );`

    try {
        await pool.query(query)
        await pool.query(devicesQuery)
        console.log('Tabela kreirana')
    } catch (error) {
        console.log('Greska ', error)
    }

}

createTable().then(() => {
    app.listen(PORT, () => {
        console.log(`Server pokrenut na portu ${PORT}`)
    })
})

app.post('/uredjaji', async (req, res) => {
    const { ime, device_id } = req.body

    if (!ime || !device_id) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const query = "INSERT INTO uredjaji (ime, device_id) VALUES ($1, $2) RETURNING *"

        const result = await pool.query(query, [ime, device_id])
        res.redirect('/uredjaji');
    } catch (error) {
        console.error("Greska ", error)
        res.status(500).json({ error: "Greska pri ubacivanju!" })
    }
})

app.get('/uredjaji', async (req, res) => {
    try {
        const query = `SELECT * FROM uredjaji`
        const result = await pool.query(query)
        const devices = result.rows
        res.render('devices', { devices });
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})

app.get('/uredjaj', async (req, res) => {
    try {
        const dev_id = req.query.device_id
        const query = `SELECT * FROM uredjaji WHERE device_id = $1;`
        const result = await pool.query(query, [dev_id])
        const device = result.rows[0]
        res.render('device', { device });
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})

app.post('/dogadjaji', async (req, res) => {
    const { tip, identifikatorUredjaja, vrednost } = req.body

    if (!tip || !identifikatorUredjaja || !vrednost) {
        return res.status(400).send("Missing required fields");
    }

    const timestamp = new Date()
    try {
        const query = "INSERT INTO dogadjaji (tip, timestamp, identifikatorUredjaja, vrednost) VALUES ($1, $2, $3, $4) RETURNING *"

        const result = await pool.query(query, [tip, timestamp, identifikatorUredjaja, vrednost])
        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Greska ", error)
        res.status(500).json({ error: "Greska pri ubacivanju!" })
    }
})


app.get('/dogadjaji', async (req, res) => {
    try {
        const dev_id = req.query.device_id
        const query = `SELECT * FROM dogadjaji WHERE identifikatorUredjaja = $1  AND timestamp >= NOW() - INTERVAL '1 hour'`
        const result = await pool.query(query, [dev_id])
        res.json(result.rows)
    } catch (error) {
        console.error("Greska pri citanju", error)
        res.status(500), json({ error: "Greska pri citanju!" })
    }
})
