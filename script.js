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

    // Načtení směnného kurzu z API ČNB pro dnešek
    async function getExchangeRate() {
        const today = new Date('2025-02-20').toISOString().split('T')[0]; // Dynamicky dnešek
        try {
            const response = await fetch(`https://api.cnb.cz/cnbapi/exrates/daily?date=${today}&lang=EN`);
            const data = await response.json();
            const usdRate = data.rates.find(rate => rate.currencyCode === 'USD');
            return usdRate ? usdRate.rate / usdRate.amount : 23; // Fallback 23 Kč/USD
        } catch (error) {
            console.warn('Načítání kurzu z ČNB selhalo:', error);
            return 23; // Fallback hodnota
        }
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

    // Případ 2: TSLA opce - simulace převedená na Kč s reálným kurzem
    async function calculateOptionsDaily(exchangeRate) {
        const initialValueUSD = 14 * 55.67; // 779.38 USD
        const initialValueCZK = initialValueUSD * exchangeRate; // Převod na Kč
        return days.map((_, index) => {
            if (index === 0) return 0; // První den = 0
            const growthUSD = initialValueUSD * 0.01; // Simulace 1% růst v USD
            return (initialValueUSD + growthUSD) * exchangeRate - initialValueCZK; // Převod na Kč
        });
    }

    // Agregace dat pro denní/týdenní/měsíční zobrazení
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

    // Funkce pro aktualizaci grafu
    async function updateChart() {
        const exchangeRate = await getExchangeRate(); // Načti kurz pro dnešek
        const flatData = calculateFlatDaily();
        const optionsData = await calculateOptionsDaily(exchangeRate);
        const flatAgg = aggregateData(flatData, view);
        const optionsAgg = aggregateData(optionsData, view);

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: flatAgg.labels,
                datasets: [
                    { label: 'Případ 1: Byt (Kč)', data: flatAgg.values, borderColor: '#1d9bf0', fill: false, tension: 0.1 },
                    { label: 'Případ 2: TSLA (Kč)', data: optionsAgg.values, borderColor: '#fff', fill: false, tension: 0.1 }
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
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#222',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${value.toFixed(2)} Kč`;
                            }
                        }
                    }
                },
                elements: { point: { radius: 0, hoverRadius: 5 } }
            }
        });

        document.getElementById('profit1').textContent = `${flatData[flatData.length - 1].toFixed(2)} Kč`;
        document.getElementById('profit2').textContent = `${optionsData[optionsData.length - 1].toFixed(2)} Kč`;
    }

    // Přepínání zobrazení
    window.changeView = (newView) => {
        view = newView;
        document.querySelectorAll('#viewSelector button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === newView);
        });
        updateChart();
    };

    // Reakce na změnu růstu nemovitosti
    growthInput.addEventListener('change', updateChart);

    // Počáteční vykreslení grafu
    await updateChart();
});