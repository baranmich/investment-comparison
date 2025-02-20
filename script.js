document.addEventListener('DOMContentLoaded', async () => {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    const growthInput = document.getElementById('growthInput');
    let chart;
    let view = 'daily';

    // Datum od 19. 2. 2025 do dneška (20. 2. 2025)
    const startDate = new Date('2025-02-19');
    const endDate = new Date('2025-02-20');
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toLocaleDateString('cs-CZ'));
    }

    // Případ 1: Byt - růst ceny + nájemné od 7/2025
    function calculateFlatDaily() {
        const flatBasePrice = 8288911;
        let price = flatBasePrice;
        let totalRent = 0;
        const dailyGrowth = (1 + parseFloat(growthInput.value) / 100) ** (1 / 365);

        return days.map(day => {
            price = price * dailyGrowth;
            const currentDate = new Date(day.split('.').reverse().join('-'));
            const rentStart = new Date('2025-07-01');
            if (currentDate >= rentStart && currentDate.getDate() === 1) {
                const monthsSinceRentStart = (currentDate.getFullYear() - 2025) * 12 + currentDate.getMonth() - 6;
                totalRent += 24200 * (1.05 ** Math.floor(monthsSinceRentStart / 12));
            }
            return price - flatBasePrice + totalRent;
        });
    }

    // Případ 2: TSLA opce - načítání z Yahoo Finance s fallbackem
    async function calculateOptionsDaily() {
        const initialValue = 14 * 55.67; // 779.38 USD
        let currentPrice = 55.67; // Výchozí hodnota (nákupní cena)

        try {
            const proxyUrl = 'https://thingproxy.freeboard.io/fetch/';
            const yahooUrl = 'https://finance.yahoo.com/quote/TSLA/options/?date=1813190400&strike=800&straddle=true';
            const response = await fetch(proxyUrl + yahooUrl);
            if (!response.ok) throw new Error('Fetch failed');
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
            console.warn('Načítání ceny opcí selhalo, použita výchozí hodnota:', error);
            currentPrice = 55.67; // Pokud selže, zůstane nákupní cena
        }

        return days.map((_, index) => index === 0 ? 0 : (currentPrice * 14) - initialValue);
    }

    // Agregace dat pro denní/týdenní/měsíční zobrazení
    functio