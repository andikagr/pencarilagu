const express = require('express');
const app = express();
const path = require('path');
const apiHandler = require('./api/index');

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/api/index', async (req, res) => {
    try {
        await apiHandler(req, res);
    } catch (error) {
        console.error('API Error:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
