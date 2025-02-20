const fetch = require('node-fetch');
const fs = require('fs');

async function updateOptionsPrice() {
    const proxyUrl = 'https://thingproxy.freeboard.io/fetch/';
    const yahooUrl = 'https://finance.yahoo.com/quote/TSLA/options/?date=1813190400&strike=800&straddle=true';
    let currentPrice = 55.67;

    try {
        const response = await fetch(proxyUrl + yahooUrl);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('table tbody tr');
        rows.forEach(row => {
            const strike = parseFloat(row.cells[1]?.textContent);
            const type = row.cells[0]?.textContent.includes('CALL') ? 'CALL' : 'PUT';
            if (strike === 800 && type === 'CALL') {
                currentPrice = parseFloat(row.cells[2]?.textContent) || currentPrice;
            }
        });
    } catch (error) {
        console.error('Chyba:', error);
    }

    const jsonData = JSON.parse(fs.readFileSync('options_data.json', 'utf8'));
    const today = new Date().toLocaleDateString('cs-CZ');
    if (!jsonData.prices.some(entry => entry.date === today)) {
        jsonData.prices.push({ date: today, price: currentPrice });
        fs.writeFileSync('options_data.json', JSON.stringify(jsonData, null, 2));
    }
}

updateOptionsPrice();
