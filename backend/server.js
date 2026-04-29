require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const RealTimeApiService = require('./RealTimeApiService');

const app = express();
app.use(express.json());
app.use(cors());

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET = process.env.BINANCE_SECRET;

const NBG_RATES = {
    'USD_GEL': 2.70,
    'EUR_USD': 1.08,
    'EUR_GEL': 2.92
};

function createBinanceSignature(queryString) {
    return crypto.createHmac('sha256', BINANCE_SECRET).update(queryString).digest('hex');
}

class P2PArbitrageBot {
    constructor() {
        this.realTimeApiService = new RealTimeApiService();
        console.log("🤖 GlobalP2P Arbitrage ლოგიკა მზადაა!");
    }

    async getP2PPrices(fiatCurrency, tradeType) {
        const livePrice = await this.realTimeApiService.getBinanceP2PDepth(fiatCurrency, tradeType, 'USDT');
        if (livePrice) {
            return livePrice;
        }

        console.log(`[Fallback] ვიყენებ სიმულაციურ ფასს: ${tradeType} USDT - ${fiatCurrency}`);
        if (fiatCurrency === 'GEL') return tradeType === 'BUY' ? 2.68 : 2.72;
        if (fiatCurrency === 'EUR') return tradeType === 'BUY' ? 0.91 : 0.93;
        return 1;
    }

    async placeMakerOrder(fiatCurrency, cryptoAmount, tradeType, price) {
        console.log(`[Order] 📝 განაცხადი შეიქმნა: ${tradeType} ${cryptoAmount.toFixed(2)} USDT. ფასი: ${price} ${fiatCurrency}`);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ status: 'COMPLETED', executedAmount: cryptoAmount });
            }, 2000);
        });
    }

    async processTransfer(clientAmount, sendCurrency, receiveCurrency) {
        try {
            const buyPrice = await this.getP2PPrices(sendCurrency, 'BUY');
            const usdtReceived = clientAmount / buyPrice;
            await this.placeMakerOrder(sendCurrency, usdtReceived, 'BUY', buyPrice);

            const sellPrice = await this.getP2PPrices(receiveCurrency, 'SELL');
            const finalFiat = usdtReceived * sellPrice;
            await this.placeMakerOrder(receiveCurrency, usdtReceived, 'SELL', sellPrice);

            const nbgRate = NBG_RATES[`${receiveCurrency}_${sendCurrency}`] || (1 / 2.92);
            const promisedToClient = clientAmount * nbgRate;
            const clientFinalReceive = promisedToClient - Math.max(promisedToClient * 0.0001, 1);

            const profit = finalFiat - clientFinalReceive;

            return {
                success: true,
                clientGets: clientFinalReceive.toFixed(2),
                currency: receiveCurrency,
                platformProfit: profit.toFixed(2),
                message: "ტრანზაქცია წარმატებულია"
            };
        } catch (error) {
            console.error("შეცდომა ლოგიკაში:", error);
            return { success: false, message: "სისტემური შეცდომა" };
        }
    }
}

const bot = new P2PArbitrageBot();

app.get('/', (req, res) => {
    res.json({ status: "GlobalP2P სერვერი ჩართულია 🚀" });
});

app.get('/api/rates', async (req, res) => {
    try {
        const realTimeApiService = new RealTimeApiService();
        const rates = await realTimeApiService.getRealFiatRates('USD');
        res.json({ USD: 1, ...rates });
    } catch (error) {
        console.error('Failed to return rates:', error);
        res.status(500).json({ error: 'Rates unavailable' });
    }
});

app.post('/api/transfer', async (req, res) => {
    const { amount, sendCurrency, receiveCurrency } = req.body;
    if (!amount || !sendCurrency || !receiveCurrency) {
        return res.status(400).json({ error: "არასრული მონაცემები" });
    }

    console.log(`\n--- მიღებულია მოთხოვნა საიტიდან: ${amount} ${sendCurrency} -> ${receiveCurrency} ---`);
    const result = await bot.processTransfer(parseFloat(amount), sendCurrency, receiveCurrency);

    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json({ error: result.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 სერვერი გაშვებულია პორტზე: ${PORT}`);
});
