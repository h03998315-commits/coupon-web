import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CONFIG ===== */
const UPI_ID = "xxxpgn.332@ptyes";
const ADMIN_PASSWORD = "admin123";
/* ================== */

app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database("database.db");
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    utr TEXT,
    created_at TEXT
  )
`);

/* ===== UTIL: ORDER ID ===== */
function generateOrderId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${date}-${rand}`;
}

/* ===== UI TEMPLATE ===== */
function page(title, body) {
  return `
<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<style>
body {
  background: #0b0f14;
  color: #e6edf3;
  font-family: 'Segoe UI', system-ui;
  margin: 0;
  padding: 40px;
}
.container {
  max-width: 480px;
  margin: auto;
}
.card {
  background: #111827;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 25px rgba(0,255,255,0.08);
  margin-bottom: 20px;
}
h1, h2 {
  color: #00eaff;
  margin-top: 0;
}
button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #00eaff, #0066ff);
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: 600;
  cursor: pointer;
}
input {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border-radius: 6px;
  border: none;
}
small {
  color: #9ca3af;
}
.code {
  background: #020617;
  padding: 8px;
  border-radius: 6px;
  font-family: monospace;
  margin: 10px 0;
}
a {
  color: #00eaff;
  text-decoration: none;
}
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>
`;
}

/* ===== HOME ===== */
app.get("/", (req, res) => {
  const orderId = generateOrderId();

  res.send(
    page(
      "Genuine Shein Shop",
      `
<div class="card">
  <h1>Genuine Shein Shop</h1>

  <p>Available Coupons</p>
  <ul>
    <li>₹500 Coupon – ₹7</li>
    <li>₹1000 Coupon – ₹14</li>
    <li>₹2000 Coupon – ₹28</li>
    <li>₹4000 Coupon – ₹56</li>
  </ul>

  <p><small>Your Order ID</small></p>
  <div class="code">${orderId}</div>

  <p><small>Pay via UPI</small></p>
  <div class="code">${UPI_ID}</div>

  <form method="POST" action="/submit">
    <input type="hidden" name="order_id" value="${orderId}">
    <input name="utr" placeholder="Enter UTR Number" required>
    <button type="submit">Submit Payment</button>
  </form>
</div>
`
    )
  );
});

/* ===== SUBMIT ===== */
app.post("/submit", (req, res) => {
  const { order_id, utr } = req.body;

  db.run(
    "INSERT INTO orders (order_id, utr, created_at) VALUES (?, ?, datetime('now'))",
    [order_id, utr]
  );

  res.send(
    page(
      "Order Received",
      `
<div class="card">
  <h2>Order Submitted</h2>
  <p>Your payment details have been received.</p>
  <p><small>Order ID</small></p>
  <div class="code">${order_id}</div>
  <p>We will verify and respond shortly.</p>
</div>
`
    )
  );
});

/* ===== ADMIN ===== */
app.get("/admin", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) {
    return res.send("Unauthorized");
  }

  db.all("SELECT * FROM orders ORDER BY id DESC", (err, rows) => {
    let rowsHtml = rows
      .map(
        r => `
<tr>
<td>${r.id}</td>
<td>${r.order_id}</td>
<td>${r.utr}</td>
<td>${r.created_at}</td>
</tr>`
      )
      .join("");

    res.send(
      page(
        "Admin Panel",
        `
<div class="card">
  <h2>Admin Panel</h2>
  <table border="1" cellpadding="6" width="100%">
    <tr><th>ID</th><th>Order</th><th>UTR</th><th>Date</th></tr>
    ${rowsHtml}
  </table>
</div>
`
      )
    );
  });
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Web service running on port", PORT);
});
