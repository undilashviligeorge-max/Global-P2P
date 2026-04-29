const axios = require('axios');

class RealTimeApiService {
    async getRealFiatRates(baseCurrency = 'USD') {
        try {
            console.log(`[API] Fetching live rates for ${baseCurrency}...`);
            const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo_key';
            const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`;
            const response = await axios.get(url);

            if (response.data && response.data.conversion_rates) {
                console.log('✅ Fiat rates updated successfully!');
                return response.data.conversion_rates;
            }
        } catch (error) {
            console.error('❌ Failed to fetch fiat rates:', error.message);
            return { GEL: 2.70, EUR: 0.92 };
        }
    }

    async getBinanceP2PDepth(fiatCurrency, tradeType = 'BUY', asset = 'USDT') {
        try {
            console.log(`[Binance API] Checking P2P market: ${tradeType} ${asset} - ${fiatCurrency}...`);
            const url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
            const payload = {
                fiat: fiatCurrency, page: 1, rows: 5, tradeType: tradeType,
                asset: asset, countries: [], payTypes: [], publisherType: null
            };

            const response = await axios.post(url, payload);
            if (response.data && response.data.data) {
                const bestOrders = response.data.data;
                if (bestOrders.length > 0) {
                    const bestPrice = parseFloat(bestOrders[0].adv.price);
                    console.log(`✅ Best price found: ${bestPrice} ${fiatCurrency}`);
                    return bestPrice;
                }
            }
        } catch (error) {
            console.error('❌ Binance P2P connection failed:', error.message);
        }
        return null;
    }
}

module.exports = RealTimeApiService;
