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

    // Případ 2: TSLA opce - načítání z JSON a aktuální ceny
    async function calculateOptionsDaily() {
        const initialValue = 14 * 55.67; // 779.38 USD (nákup 19. 2. 2025)

        // Načti historická data z JSON
        const jsonResponse = await fetch('./options_data.json');
        const jsonData = await jsonResponse.json();
        const historicalPrices = jsonData.prices;

        // Načti aktuální cenu z Yahoo Finance
        const proxyUrl = 'https://thingproxy.freeboard.io/fetch/';
        const yahooUrl = 'https://finance.yahoo.com/quote/TSLA/options/?date=1813190400&strike=800&straddle=true';
        let currentPrice = historicalPrices[historicalPrices.length - 1].price; // Poslední známá cena
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
            console.error('Chyba při načítání dat z Yahoo:', error);
        }

        // Vytvoř pole zisku pro každý den
        const optionsData = days.map(day => {
            const historicalEntry = historicalPrices.find(entry => entry.date === day);
            const price = historicalEntry ? historicalEntry.price : currentPrice;
            return (price * 14) - initialValue;
        });
        return optionsData;
    }

    // Agregace dat
    function aggregateData(data, period) {
        if (period === 'daily') return { labels: days, values: data };
        const result = { labels: [], values: [] };
        let step = period === 'weekly' ? 7 : 30;
        for (let i = 0; i < data.length; i += step) {
            result.labels.push(days[i]);
            result.values.push(data[Math.min(i + step - 1, data.length - 1)]);
        }
        return result;
    }

    async function updateChart() {
        const flatData = calculateFlatDaily();
        const optionsData = await calculateOptionsDaily();
        const flatAgg = aggregateData(flatData, view);
        const optionsAgg = aggregateData(optionsData, view);

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: flatAgg.labels,
                datasets: [
                    { label: 'Případ 1: Byt (Kč)', data: flatAgg.values, borderColor: '#1d9bf0', backgroundColor: 'rgba(29, 155, 240, 0.2)', fill: false, tension: 0.1 },
                    { label: 'Případ 2: TSLA (USD)', data: optionsAgg.values, borderColor: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.2)', fill: false, tension: 0.1 }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { grid: { color: '#333' }, ticks: { color: '#d9d9d9' } },
                    y: { grid: { color: '#333' }, ticks: { color: '#d9d9d9' }, beginAtZero: true }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: { backgroundColor: '#222', titleColor: '#fff', bodyColor: '#fff' }
                },
                elements: { point: { radius: 0, hoverRadius: 5 } }
            }
        });

        document.getElementById('profit1').textContent = `${flatData[flatData.length - 1].toFixed(2)} Kč`;
        document.getElementById('profit2').textContent = `${optionsData[optionsData.length - 1].toFixed(2)} USD`;
    }

    window.changeView = (newView) => {
        view = newView;
        document.querySelectorAll('#viewSelector button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === newView);
        });
        updateChart();
    };

    growthInput.addEventListener('change', updateChart);
    await updateChart();
});