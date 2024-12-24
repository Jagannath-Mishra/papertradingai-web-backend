const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/users');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Node.js & PostgreSQL API!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
