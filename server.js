const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (like index.html)
app.use(express.static(__dirname));

// The master list of 12 allowed colors
const MASTER_COLOR_LIST = [
    'blue', 'red', 'yellow', 'brown', 'green', 'purple', 
    'orange', 'white', 'black', 'pink', 'gray', 'silver'
];

/**
 * Fisher-Yates shuffle algorithm.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Reads the current state from the database file.
 */
async function getState() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading database:", error);
        // If the file is missing or corrupt, return a fresh, shuffled state
        let newShuffled = [...MASTER_COLOR_LIST];
        shuffleArray(newShuffled);
        return { shuffledColors: newShuffled, colorIndex: 0 };
    }
}

/**
 * Writes the new state to the database file.
 */
async function saveState(state) {
    await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ------------------- API Endpoints -------------------

// 1. Endpoint to get the current state (called on page load)
app.get('/api/state', async (req, res) => {
    const state = await getState();
    res.json({
        currentColor: state.shuffledColors[state.colorIndex],
        colorIndex: state.colorIndex,
        totalColors: state.shuffledColors.length,
        isCycleComplete: state.colorIndex >= state.shuffledColors.length
    });
});

// 2. Endpoint to generate and advance to the next color (called on button click)
app.post('/api/next-color', async (req, res) => {
    let state = await getState();

    // --- Cycle Management Logic ---
    if (state.shuffledColors.length === 0 || state.colorIndex >= state.shuffledColors.length) {
        // If cycle is complete or initial state is empty, start a new cycle
        state.shuffledColors = [...MASTER_COLOR_LIST];
        shuffleArray(state.shuffledColors);
        state.colorIndex = 0;
    }

    const selectedColor = state.shuffledColors[state.colorIndex];
    
    // Advance the index for the next click
    state.colorIndex++;

    // Save the updated state before responding
    await saveState(state);

    res.json({
        selectedColor: selectedColor,
        newIndex: state.colorIndex,
        totalColors: state.shuffledColors.length,
        isCycleComplete: state.colorIndex >= state.shuffledColors.length
    });
});

// Force reset to clear the stored state.
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/index.html in your browser.`);
});
