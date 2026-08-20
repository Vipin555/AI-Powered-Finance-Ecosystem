const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Data Directory & Persistent Storage Setup ────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_DATA_FILE = path.join(DATA_DIR, 'userData.json');

// Helper functions for file I/O
function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
  return fallback;
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'finexo_salt_2026').digest('hex');
}

// Initialize seed users if not present
function initializeData() {
  let users = readJSON(USERS_FILE, null);
  if (!users || !Array.isArray(users) || users.length === 0) {
    users = [
      {
        id: 'user_admin_001',
        name: 'Super Admin',
        email: 'admin@finexo.ai',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        createdAt: '2026-01-15T10:00:00.000Z',
        lastLogin: new Date().toISOString()
      },
      {
        id: 'user_demo_002',
        name: 'Alex Sharma',
        email: 'demo@finexo.ai',
        passwordHash: hashPassword('demo123'),
        role: 'user',
        createdAt: '2026-02-10T14:30:00.000Z',
        lastLogin: new Date().toISOString()
      }
    ];
    writeJSON(USERS_FILE, users);
  }

  let userData = readJSON(USER_DATA_FILE, null);
  if (!userData) {
    userData = {
      user_demo_002: {
        advisor: {
          age: 29,
          monthly_income: 95000,
          monthly_expenses: 38000,
          total_emis: 12000,
          total_assets: 850000,
          total_liabilities: 240000,
          current_investments: 420000,
          emergency_fund: 210000,
          dependents: 1,
          monthly_sip: 18000
        },
        tax: {
          salary_income: 1400000,
          business_income: 0,
          house_property_loss: 0,
          other_income: 45000,
          stcg: 15000,
          ltcg: 60000,
          stcg_debt: 0,
          ltcg_debt: 0,
          sec_80c: 150000,
          sec_80d_self: 25000,
          sec_80d_parents: 25000,
          sec_80ccd_1b: 50000,
          sec_80tta: 10000,
          sec_80g: 0,
          sec_24b: 0,
          sec_80e: 0,
          sec_80eea: 0,
          hra_exempt: 120000,
          lta_exempt: 0,
          standard_deduction: 75000,
          age: 29,
          residential_status: 'Resident',
          regime_choice: 'Auto'
        },
        simulator: {
          goal_name: 'Retirement & Wealth Independence',
          target_amount: 15000000,
          years_horizon: 15,
          current_savings: 850000,
          monthly_investment: 35000,
          expected_return: 12.5,
          inflation_rate: 6.0
        },
        portfolio: {
          current_equity: 55,
          current_debt: 25,
          current_gold: 12,
          current_cash: 8,
          total_portfolio_value: 1240000,
          monthly_contribution: 20000,
          risk_tolerance: 'Moderate'
        },
        irregular_income: {
          average_monthly_income: 85000,
          min_monthly_income: 30000,
          max_monthly_income: 160000,
          essential_expenses: 42000,
          buffer_target_months: 6,
          current_buffer: 180000
        }
      }
    };
    writeJSON(USER_DATA_FILE, userData);
  }
}

initializeData();

// ─── Simple Token / Auth Middleware ──────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const users = readJSON(USERS_FILE, []);
  
  // For demo/production-ready light setup, token format is user_id:base64_sig
  const [userId] = token.split(':');
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = readJSON(USERS_FILE, []);

  if (users.find(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: normalizedEmail.includes('admin') ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  const token = `${newUser.id}:${Buffer.from(newUser.email).toString('base64')}`;
  const { passwordHash, ...userProfile } = newUser;

  res.status(201).json({
    message: 'User registered successfully',
    user: userProfile,
    token
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  writeJSON(USERS_FILE, users);

  const token = `${user.id}:${Buffer.from(user.email).toString('base64')}`;
  const { passwordHash, ...userProfile } = user;

  res.json({
    message: 'Login successful',
    user: userProfile,
    token
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { passwordHash, ...userProfile } = req.user;
  res.json({ user: userProfile });
});

// ─── User Engine Data Persistence & Autofill Routes ──────────────────────────
app.get('/api/user/data', authenticateToken, (req, res) => {
  const allUserData = readJSON(USER_DATA_FILE, {});
  const userStoredData = allUserData[req.user.id] || {};
  res.json({ data: userStoredData });
});

app.get('/api/user/data/:engineId', authenticateToken, (req, res) => {
  const { engineId } = req.params;
  const allUserData = readJSON(USER_DATA_FILE, {});
  const userStoredData = allUserData[req.user.id] || {};
  res.json({ data: userStoredData[engineId] || null });
});

app.put('/api/user/data', authenticateToken, (req, res) => {
  const { engineId, data } = req.body;
  if (!engineId || !data) {
    return res.status(400).json({ error: 'engineId and data payload are required.' });
  }

  const allUserData = readJSON(USER_DATA_FILE, {});
  if (!allUserData[req.user.id]) {
    allUserData[req.user.id] = {};
  }

  allUserData[req.user.id][engineId] = {
    ...allUserData[req.user.id][engineId],
    ...data,
    updatedAt: new Date().toISOString()
  };

  writeJSON(USER_DATA_FILE, allUserData);
  res.json({ message: `Data saved for engine: ${engineId}`, data: allUserData[req.user.id][engineId] });
});

// ─── Admin Management Routes ─────────────────────────────────────────────────
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const allUserData = readJSON(USER_DATA_FILE, {});

  let totalEnginesSaved = 0;
  Object.values(allUserData).forEach(userEntry => {
    totalEnginesSaved += Object.keys(userEntry).length;
  });

  res.json({
    totalUsers: users.length,
    totalAdmins: users.filter(u => u.role === 'admin').length,
    totalRegularUsers: users.filter(u => u.role === 'user').length,
    totalEnginesSaved,
    systemUptime: process.uptime(),
    activeEnginesCount: 5,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const allUserData = readJSON(USER_DATA_FILE, {});

  const usersList = users.map(u => {
    const userStorage = allUserData[u.id] || {};
    const savedEngines = Object.keys(userStorage);
    const { passwordHash, ...safeUser } = u;
    return {
      ...safeUser,
      savedEnginesCount: savedEngines.length,
      savedEnginesList: savedEngines,
      hasFinancialAdvisorData: Boolean(userStorage.advisor),
      hasTaxData: Boolean(userStorage.tax),
      hasSimulatorData: Boolean(userStorage.simulator),
      hasPortfolioData: Boolean(userStorage.portfolio),
      hasIrregularIncomeData: Boolean(userStorage.irregular_income)
    };
  });

  res.json({ users: usersList });
});

app.get('/api/admin/users/:userId/data', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const allUserData = readJSON(USER_DATA_FILE, {});
  const userStorage = allUserData[userId] || {};
  const { passwordHash, ...safeUser } = user;

  res.json({
    user: safeUser,
    storedData: userStorage
  });
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  let users = readJSON(USERS_FILE, []);
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  users = users.filter(u => u.id !== userId);
  writeJSON(USERS_FILE, users);

  const allUserData = readJSON(USER_DATA_FILE, {});
  delete allUserData[userId];
  writeJSON(USER_DATA_FILE, allUserData);

  res.json({ message: `User ${targetUser.email} deleted successfully.` });
});

app.put('/api/admin/users/:userId/role', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }

  const users = readJSON(USERS_FILE, []);
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  targetUser.role = role;
  writeJSON(USERS_FILE, users);

  res.json({ message: `Role updated to ${role} for ${targetUser.email}` });
});

// ─── Engine Catalog Routes ───────────────────────────────────────────────────
const engines = [
  {
    id: "financial-advisor",
    name: "AI Financial Advisor Engine",
    description: "Personalized, data-driven financial advice tailored to your goals.",
    icon: "🧠",
    status: "Active",
    route: "/advisor"
  },
  {
    id: "tax-planning",
    name: "AI Tax Planning Engine",
    description: "Optimize profit harvesting and loss harvesting seamlessly.",
    icon: "⚖️",
    status: "Active",
    route: "/tax"
  },
  {
    id: "life-goal",
    name: "Life Goal Simulator",
    description: "Simulate and visualize your path to major life milestones.",
    icon: "🎯",
    status: "Active",
    route: "/simulator"
  },
  {
    id: "portfolio-growth",
    name: "Portfolio Growth & Rebalancing",
    description: "Maximize returns with intelligent, automated portfolio rebalancing.",
    icon: "📈",
    status: "Active",
    route: "/portfolio"
  },
  {
    id: "irregular-income",
    name: "Irregular Income Planning",
    description: "Stabilize cash flow for freelancers and contractors.",
    icon: "💸",
    status: "Active",
    route: "/irregular-income"
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
  console.log(`Express Backend running on http://localhost:${PORT}`);
});
