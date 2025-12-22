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

/* ===== DB SETUP ===== */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      utr TEXT,
      status TEXT DEFAULT 'PENDING',
      coupon TEXT,
      created_at TEXT
    )
  `);
});

/* ===== UTIL ===== */
function generateOrderId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${date}-${rand}`;
}

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
  font-family: system-ui;
  padding: 40px;
}
.container { max-width: 520px; margin: auto; }
.card {
  background: #111827;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 25px rgba(0,255,255,0.08);
  margin-bottom: 20px;
}
h1, h2 { color: #00eaff; }
.code {
  background: #020617;
  padding: 8px;
  border-radius: 6px;
  font-family: monospace;
  margin: 10px 0;
}
button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #00eaff, #0066ff);
  border: none;
  border-radius: 8px;
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
small { color: #9ca3af; }
a { color: #00eaff; }
table { width: 100%; border-collapse: collapse; }
td, th { border: 1px solid #334155; padding: 6px; }
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
    page("Genuine Shein Shop", `
<div class="card">
<h1>Genuine Shein Shop</h1>

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
`)
  );
});

/* ===== SUBMIT ===== */
app.post("/submit", (req, res) => {
  const { order_id, utr } = req.body;

  db.run(
    `INSERT INTO orders (order_id, utr, status, created_at)
     VALUES (?, ?, 'PENDING', datetime('now'))`,
    [order_id, utr],
    () => res.redirect(`/order/${order_id}`)
  );
});

/* ===== ORDER TRACKING ===== */
app.get("/order/:orderId", (req, res) => {
  db.get(
    "SELECT * FROM orders WHERE order_id = ?",
    [req.params.orderId],
    (err, order) => {
      if (!order) return res.send("Order not found");

      let content = `
<div class="card">
<h2>Order Status</h2>
<p><small>Order ID</small></p>
<div class="code">${order.order_id}</div>
`;

      if (order.status === "APPROVED") {
        content += `
<p><small>Your Coupon Code</small></p>
<div class="code">${order.coupon}</div>
<p>✅ Payment verified</p>
`;
      } else {
        content += `<p>⏳ Payment under verification</p>`;
      }

      content += `</div>`;
      res.send(page("Order Status", content));
    }
  );
});

/* ===== ADMIN ===== */
app.get("/admin", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  db.all("SELECT * FROM orders ORDER BY id DESC", (err, rows) => {
    let html = rows.map(o => `
<tr>
<td>${o.order_id}</td>
<td>${o.utr}</td>
<td>${o.status}</td>
<td>
<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
<input type="hidden" name="order_id" value="${o.order_id}">
<input name="coupon" placeholder="Coupon code" required>
<button type="submit">Approve</button>
</form>
</td>
</tr>
`).join("");

    res.send(
      page("Admin Panel", `
<div class="card">
<h2>Admin Panel</h2>
<table>
<tr><th>Order</th><th>UTR</th><th>Status</th><th>Action</th></tr>
${html}
</table>
</div>
`)
    );
  });
});

/* ===== APPROVE ===== */
app.post("/approve", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  const { order_id, coupon } = req.body;

  db.run(
    `UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?`,
    [coupon, order_id],
    () => res.redirect(`/admin?pass=${ADMIN_PASSWORD}`)
  );
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Web service running on port", PORT);
});
