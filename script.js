document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    const growthInput = document.getElementById('growthInput');
    let chart;
    let view = 'daily'; // Výchozí zobrazení

    // Datum od začátku roku 2025 do dneška (20. 2. 2025)
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-02-20'); // Dnešní datum
    const days = [];
    const dailyDataFlat = [];
    const dailyDataOptions = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toLocaleDateString('cs-CZ'));
    }

    // Výpočet Případu 1: Byt
    function calculateFlatDaily() {
        const flatBasePrice = 8288911;
        let price = flatBasePrice;
        let totalRent = 0;
        let totalSVJ = 0;
        let totalManagement = 0;
        const dailyGrowth = (1 + parseFloat(growthInput.value) / 100) ** (1 / 365); // Denní složené úročení
        const initialCosts = 152516 + 150000 + 228774 + 531290;
        const loan = 7625798 - 292068;
        const dailyInterest = (1 + 0.0479) ** (1 / 365) - 1; // Denní úrok hypotéky

        return days.map((day, index) => {
            price = price * dailyGrowth; // Růst ceny nemovitosti
            const daysSinceStart = index + 1;
            const interest = loan * dailyInterest * daysSinceStart;

            // Nájemné, SVJ, správa od 7/2025
            const rentStart = new Date('2025-07-01');
            if (new Date(day.split('.').reverse().join('-')) >= rentStart) {
                const daysRented = Math.max(0, (new Date(day.split('.').reverse().join('-')) - rentStart) / (1000 * 60 * 60 * 24));
                totalRent = 24200 * (daysRented / 30); // Přibližný měsíční nájem
                totalSVJ = 1012 * (daysRented / 30);
                totalManagement = totalRent * 0.1;
            }

            return price - flatBasePrice + totalRent - totalSVJ - totalManagement - initialCosts - interest;
        });
    }

    // Výpočet Případu 2: TSLA opce (simulace, reálná data přes API později)
    function calculateOptionsDaily() {
        const tslaOptions = 14 * 55.67; // 779.38 USD
        const dailyGrowth = 1.001; // Simulovaný růst 0.1 % denně (nahradíš reálnými daty)
        return days.map((_, index) => tslaOptions * (dailyGrowth ** index) - tslaOptions);
    }

    // Agregace dat pro týdenní a měsíční zobrazení
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

    function updateChart() {
        const flatData = calculateFlatDaily();
        const optionsData = calculateOptionsDaily();
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

    // Přepínání zobrazení
    window.changeView = (newView) => {
        view = newView;
        document.querySelectorAll('#viewSelector button').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === newView);
        });
        updateChart();
    };

    growthInput.addEventListener('change', updateChart);
    updateChart(); // Počáteční vykreslení
});