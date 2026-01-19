const express = require('express');
const app = express();
const path = require('path');
const apiHandler = require('./api/index');

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle API requests
app.get('/api/index', async (req, res) => {
    try {
        await apiHandler(req, res);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
