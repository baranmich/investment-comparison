document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    const growthInput = document.getElementById('growthInput');
    let chart;

    // Počáteční data
    const years = [2025, 2026, 2027, 2028, 2029];
    const flatBasePrice = 8288911; // Původní cena bytu
    const tslaOptions = 14 * 55.67; // Počáteční hodnota opcí v USD (779.38 USD)

    function calculateFlatProfit(year) {
        let price = flatBasePrice;
        let totalRent = 0;
        let totalSVJ = 0;
        let totalManagement = 0;

        for (let y = 2025; y <= year; y++) {
            // Růst ceny nemovitosti
            if (y === 2025) price *= 1.03; // 3% růst v 2025
            else price *= 1.05; // 5% růst další roky

            // Nájemné, SVJ, správa
            if (y >= 2025) {
                let rent = (y === 2025 ? 24200 * 6 : 24200 * 12); // 6 měsíců v 2025
                let svj = (y === 2025 ? 1012 * 6 : 1012 * 12); // 6 měsíců v 2025
                for (let i = 2026; i <= y; i++) {
                    rent *= 1.05; // 5% růst nájemného
                    svj *= 1.10; // 10% růst SVJ
                }
                totalRent += rent;
                totalSVJ += svj;
                totalManagement += rent * 0.1; // 10% správa
            }
        }

        const initialCosts = 152516 + 150000 + 228774 + 531290; // Okamžité náklady + vlastní zdroje
        const loan = 7625798 - 292068; // Hypotéka po slevě
        const interest = loan * 0.0479 * (year - 2025 + 1); // Úrok 4,79 %
        return price - flatBasePrice + totalRent - totalSVJ - totalManagement - initialCosts - interest;
    }

    function calculateOptionsProfit(year) {
        // Simulace: Hodnota opcí naroste např. o 10 % ročně (pro ukázku, reálně bys použil API)
        let value = tslaOptions;
        for (let y = 2025; y <= year; y++) value *= 1.10;
        return value - tslaOptions; // Zisk
    }

    function updateChart() {
        const flatProfits = years.map(year => calculateFlatProfit(year));
        const optionsProfits = years.map(year => calculateOptionsProfit(year));

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    { label: 'Případ 1: Byt (Kč)', data: flatProfits, borderColor: '#00b4d8', fill: false },
                    { label: 'Případ 2: TSLA opce (USD)', data: optionsProfits, borderColor: '#90e0ef', fill: false }
                ]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });

        document.getElementById('profit1').textContent = `${flatProfits[flatProfits.length - 1].toFixed(2)} Kč`;
        document.getElementById('profit2').textContent = `${optionsProfits[optionsProfits.length - 1].toFixed(2)} USD`;
    }

    // Při změně růstu nemovitosti
    growthInput.addEventListener('change', () => {
        flatBasePriceGrowth = parseFloat(growthInput.value) / 100;
        updateChart();
    });

    updateChart(); // Počáteční vykreslení
});