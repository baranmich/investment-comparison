document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    const growthInput = document.getElementById('growthInput');
    let chart;
    let view = 'daily';

    const startDate = new Date('2025-02-19');
    const endDate = new Date('2025-02-20');
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toLocaleDateString('cs-CZ'));
    }

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

    function calculateOptionsDaily() {
        const initialValue = 14 * 55.67; // 779.38 USD
        return days.map((_, index) => index === 0 ? 0 : initialValue * 0.01); // Simulace 1% růst
    }

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
                    { label: 'Případ 1: Byt (Kč)', data: flatAgg.values, borderColor: '#1d9bf0', fill: false },
                    { label: 'Případ 2: TSLA (USD)', data: optionsAgg.values, borderColor: '#fff', fill: false }
                ]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
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
    updateChart();
});