// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('./lib/client');
const request = require ('superagent');
// Initiate database connection
client.connect();

// Application Setup
const app = express();
const PORT = process.env.PORT;
app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data
// API Routes

app.use(express.urlencoded({ extended: true }));
const createAuthRoutes = require('./lib/auth/create-auth-routes');

const authRoutes = createAuthRoutes({
    
    selectUser(email) {
        return client.query(`
            SELECT id, email, hash 
            FROM users
            WHERE email = $1;
        `,
        [email]
        ).then(result => result.rows[0]);
    },
    insertUser(user, hash) {
        return client.query(`
            INSERT into users (email, hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email;
        `,
        [user.email, hash, user.display_name]
        ).then(result => result.rows[0]);
    }
});
// before ensure auth, but after other middleware:
app.use('/api/auth', authRoutes);

const ensureAuth = require('./lib/auth/ensure-auth');
app.use('/api/me', ensureAuth);



app.get('/api/me/favorites', async(req, res) => {
    try {
        const myQuery = `
            SELECT * FROM favorites
            WHERE user_id = $1
       `;
        const favorites = await client.query(myQuery, [req.userId]);
        res.json(favorites.rows);
    } catch (e){
        console.error(e);
    }
});

app.post('/api/me/favorites', async(req, res) => {
    try {
        const {
            name,
            status,
            images,
        } = req.body;

        const newFavorite = await client.query(`
            INSERT INTO favorites (name,category, instructions,user_id)
            values ($1,$2,$3,$4)
            returning *
        `, [
            name,
            status,
            images,
            req.userId

        ]); 

        res.json(newFavorite.rows[0]);

    } catch (e){
        console.error(e);
    }
});

app.get('/api/character', async(req, res) => {
    try {
        const data = await request.get(`https://rickandmortyapi.com/api/character/?name=${req.query.name}`);
        res.json(data.body);
    } catch (e){
        console.error(e);
    }
});












app.listen(PORT, () => {
    console.log('server running on PORT', PORT);
});