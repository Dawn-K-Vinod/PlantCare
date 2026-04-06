require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const plantsRouter = require('./routes/plants');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/plants', plantsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));