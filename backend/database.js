const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize tables
        db.run(`CREATE TABLE IF NOT EXISTS UserAgreements (
            phoneNumber TEXT PRIMARY KEY,
            agreedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating UserAgreements table', err.message);
            } else {
                console.log('UserAgreements table ready.');
            }
        });
    }
});

// Helper to query the DB with promises
const checkAgreement = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM UserAgreements WHERE phoneNumber = ?', [phoneNumber], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const saveAgreement = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO UserAgreements (phoneNumber) 
            VALUES (?) 
            ON CONFLICT(phoneNumber) 
            DO UPDATE SET updatedAt = CURRENT_TIMESTAMP
        `;
        db.run(query, [phoneNumber], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
};

module.exports = {
    db,
    checkAgreement,
    saveAgreement
};
