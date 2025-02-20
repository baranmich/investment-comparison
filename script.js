document.addEventListener('DOMContentLoaded', async () => {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    let chart;
    let view = 'daily';

    // Datum od 19. 2. 2025 do dneška (20. 2. 2025)
    const startDate = new Date('2025-02-19');
    const endDate = new Date('2025-02-20');
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toLocaleDateString('cs-CZ'));
    }

    // Dynamické přidání inputů pro růst podle roku
    const currentYear = new Date('2025-02-20').getFullYear();
    const growthInputsDiv = document.getElementById('growthInputs');
    growthInputsDiv.innerHTML = '';
    const addedYears = new Set();
    for (let year = 2025; year <= currentYear; year++) {
        if (addedYears.has(year)) continue;
        addedYears.add(year);

        const label = document.createElement('label');
        label.setAttribute('for', `growthInput-${year}`);
        label.textContent = `Nastav růst nemovitosti pro rok ${year} (%):`;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `growthInput-${year}`;
        input.value = year === 2025 ? 3 : 5;
        input.min = '0';
        input.step = '0.1';
        growthInputsDiv.appendChild(label);
        growthInputsDiv.appendChild(input);
        growthInputsDiv.appendChild(document.createElement('br'));
        input.addEventListener('change', updateChart);
    }

    // Případ 1: Byt - růst ceny + nájemné od 7/2025
    function calculateFlatDaily() {
        const flatBasePrice = 8288911;
        let price = flatBasePrice;
        let totalRent = 0;

        const result = days.map(day => {
            const currentDate = new Date(day.split('.').reverse().join('-'));
            const year = currentDate.getFullYear();
            const growthInput = document.getElementById(`growthInput-${year}`);
            const yearlyGrowth = growthInput ? parseFloat(growthInput.value) / 100 : 0.03;
            const dailyGrowth = (1 + yearlyGrowth) ** (1 / 365);
            price = price * dailyGrowth;

            const rentStart = new Date('2025-07-01');
            if (currentDate >= rentStart && currentDate.getDate() === 1) {
                const monthsSinceRentStart = (year - 2025) * 12 + currentDate.getMonth() - 6;
                totalRent += 24200 * (1.05 ** Math.floor(monthsSinceRentStart / 12));
            }
            return price - flatBasePrice + totalRent;
        });
        console.log('Flat Data:', result); // Ladící výpis
        return result;
    }

    // Případ 2: TSLA opce - vrací zisk a cenu opce z JSON
    async function calculateOptionsDaily() {
        const initialValueUSD = 14 * 55.67; // 779.38 USD
        let historicalPrices = [];
        try {
            const response = await fetch('./options_data.json');
            const data = await response.json();
            historicalPrices = data.prices;
        } catch (error) {
            console.warn('Načítání options_data.json selhalo:', error);
            historicalPrices = [{ date: "19.02.2025", optionPrice: 55.67, exchangeRate: 23 }];
        }

        const result = days.map(day => {
            const historicalEntry = historicalPrices.find(entry => entry.date === day);
            let priceUSDPerOption, exchangeRate;
            if (historicalEntry) {
                priceUSDPerOption = historicalEntry.optionPrice;
                exchangeRate = historicalEntry.exchangeRate;
            } else {
                const lastEntry = historicalPrices[historicalPrices.length - 1];
                priceUSDPerOption = lastEntry.optionPrice + (lastEntry.optionPrice * 0.01);
                exchangeRate = lastEntry.exchangeRate;
            }
            const priceUSDTotal = priceUSDPerOption * 14;
            const profitCZK = (priceUSDTotal - initialValueUSD) * exchangeRate;
            return { profitCZK: profitCZK, priceUSD: priceUSDPerOption };
        });
        console.log('Options Data:', result); // Ladící výpis
        return result;
    }

    // Agregace dat pro denní/týdenní/měsíční zobrazení
    function aggregateData(data, period, isFlat = false) {
        if (isFlat) {
            if (period === 'daily') return { labels: days, values: data };
            const result = { labels: [], values: [] };
            let step = period === 'weekly' ? 7 : 30;
            for (let i = 0; i < data.length; i += step) {
                const index = Math.min(i + step - 1, data.length - 1);
                result.labels.push(days[i]);
                result.values.push(data[index]);
            }
            return result;
        } else {
            if (period === 'daily') return { labels: days, values: data.map(item => item.profitCZK), customData: data };
            const result = { labels: [], values: [], customData: [] };
            let step = period === 'weekly' ? 7 : 30;
            for (let i = 0; i < data.length; i += step) {
                const index = Math.min(i + step - 1, data.length - 1);
                result.labels.push(days[i]);
                result.values.push(data[index].profitCZK);
                result.customData.push(data[index]);
            }
            return result;
        }
    }

    // Funkce pro aktualizaci grafu
    async function updateChart() {
        const flatData = calculateFlatDaily();
        const optionsDataFull = await calculateOptionsDaily();
        const flatAgg = aggregateData(flatData, view, true);
        const optionsAgg = aggregateData(optionsDataFull, view);

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: flatAgg.labels,
                datasets: [
                    { 
                        label: 'Případ 1: Byt (Kč)', 
                        data: flatAgg.values, 
                        borderColor: '#1d9bf0', 
                        fill: false, 
                        tension: 0.1 
                    },
                    { 
                        label: 'Případ 2: TSLA (Kč)', 
                        data: optionsAgg.values, 
                        borderColor: '#fff', 
                        fill: false, 
                        tension: 0.1, 
                        customData: optionsAgg.customData 
                    }
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
                                if (context.dataset.label === 'Případ 2: TSLA (Kč)') {
                                    const index = context.dataIndex;
                                    const priceUSD = context.dataset.customData[index].priceUSD;
                                    return `${context.dataset.label}: ${value.toFixed(2)} Kč\nCena 1 opce: ${priceUSD.toFixed(2)} USD`;
                                }
                                return `${context.dataset.label}: ${value.toFixed(2)} Kč`;
                            }
                        }
                    }
                },
                elements: { point: { radius: 0, hoverRadius: 5 } }
            }
        });

        document.getElementById('profit1').textContent = `${flatData[flatData.length - 1].toFixed(2)} Kč`;
        document.getElementById('profit2').textContent = `${optionsDataFull[optionsDataFull.length - 1].profitCZK.toFixed(2)} Kč`;
    }

    // Přepínání zobrazení
    window.changeView = (newView) => {
        view = newView;
        document.querySelectorAll('#viewSelector button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === newView);
        });
        updateChart();
    };

    // Počáteční vykreslení grafu
    await updateChart();
});