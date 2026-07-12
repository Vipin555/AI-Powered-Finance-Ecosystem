const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const engines = [
    {
        id: "financial-advisor",
        name: "AI Financial Advisor Engine",
        description: "Personalized, data-driven financial advice tailored to your goals.",
        icon: "🧠",
        status: "Active"
    },
    {
        id: "tax-planning",
        name: "AI Tax Planning Engine",
        description: "Optimize profit harvesting and loss harvesting seamlessly.",
        icon: "⚖️",
        status: "Active"
    },
    {
        id: "life-goal",
        name: "Life Goal Simulator",
        description: "Simulate and visualize your path to major life milestones.",
        icon: "🎯",
        status: "Active"
    },
    {
        id: "portfolio-growth",
        name: "Portfolio Growth & Rebalancing",
        description: "Maximize returns with intelligent, automated portfolio rebalancing.",
        icon: "📈",
        status: "Active"
    },
    {
        id: "irregular-income",
        name: "Irregular Income Planning",
        description: "Stabilize cash flow for freelancers and contractors.",
        icon: "💸",
        status: "Active"
    },
    {
        id: "chatbot",
        name: "AI Financial Chatbot",
        description: "RAG-Based assistant ready to answer any financial query.",
        icon: "🤖",
        status: "Active"
    }
];

app.get('/api/engines', (req, res) => {
    res.json(engines);
});

app.get('/api/engines/:id', (req, res) => {
    const engine = engines.find(e => e.id === req.params.id);
    if (engine) {
        res.json(engine);
    } else {
        res.status(404).json({ error: "Engine not found" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
