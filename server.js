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
app.use('/api', ensureAuth);

app.get('/api/drink', async(req, res) => {
    const data = await request.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${req.query.s}`);
    res.json(data.body);
});

















app.listen(PORT, () => {
    console.log('server running on PORT', PORT);
});