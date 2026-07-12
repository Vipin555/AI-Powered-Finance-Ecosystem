# AI-Powered Finance Ecosystem

An advanced, data-driven financial ecosystem combining an AI Financial Advisor, an AI Tax Planning Engine, and a Life Goal Simulator.

## Architecture Overview

The project consists of three main components:
1. **Frontend**: A modern React application built with Vite and styled with custom CSS.
2. **Express Backend**: A Node.js Express server running on port `5000` to serve catalog/metadata and engine information.
3. **Python AI Backend**: A FastAPI server running on port `8000` handling advanced calculations, optimization models (using CVXPY), and predictions (using XGBoost & scikit-learn).

---

## Prerequisites

Before running the application, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v16 or higher)
* [Python](https://www.python.org/) (v3.9 or higher)
* `pip` (Python package manager)

---

## Setup & Running Instructions

### 1. Python AI Backend (FastAPI)
The Python backend processes the core financial advising, tax planning optimizations, and goal simulations.

1. Navigate to the `python_backend` directory:
   ```bash
   cd python_backend
   ```
2. Create a virtual environment:
   * **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server (runs on `http://localhost:8000`):
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Express Backend (Node.js)
This server manages active engine configurations and settings.

1. Navigate to the `backend` directory:
   ```bash
   cd ../backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express server (runs on `http://localhost:5000`):
   ```bash
   node server.js
   ```

### 3. Frontend (React + Vite)
This is the user-facing web interface.

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## Features

* **🧠 AI Financial Advisor**: Analyzes income, expenses, assets, and liabilities to output financial health scores, vulnerability assessments, and automated budgeting recommendations.
* **⚖️ AI Tax Planning**: Optimizes old vs. new regime tax calculations, recommends investments, and harvest strategies.
* **🎯 Life Goal Simulator**: Models complex savings, investments, and inflation scenarios to forecast success rates for major life milestones.
