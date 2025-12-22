import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CONFIG ===== */
const UPI_ID = "xxxpgn.332@ptyes";
const ADMIN_PASSWORD = "admin123"; // change later
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

/* ===== HOME ===== */
app.get("/", (req, res) => {
  res.send(`
    <h1>🛍 Genuine Shein Shop</h1>

    <ul>
      <li>₹500 Coupon – ₹7</li>
      <li>₹1000 Coupon – ₹14</li>
      <li>₹2000 Coupon – ₹28</li>
      <li>₹4000 Coupon – ₹56</li>
    </ul>

    <p><b>UPI ID:</b> ${UPI_ID}</p>

    <p>Pay via UPI and submit details below.</p>
    <a href="/submit">Submit Payment</a>
  `);
});

/* ===== SUBMIT FORM ===== */
app.get("/submit", (req, res) => {
  res.send(`
    <h2>Submit Payment</h2>

    <form method="POST">
      <input name="order_id" placeholder="Order ID" required /><br><br>
      <input name="utr" placeholder="UTR Number" required /><br><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

/* ===== HANDLE SUBMIT ===== */
app.post("/submit", (req, res) => {
  const { order_id, utr } = req.body;

  db.run(
    "INSERT INTO orders (order_id, utr, created_at) VALUES (?, ?, datetime('now'))",
    [order_id, utr]
  );

  res.redirect("/success");
});

/* ===== SUCCESS ===== */
app.get("/success", (req, res) => {
  res.send(`
    <h2>✅ Order Received</h2>
    <p>Your payment details have been submitted.</p>
    <p>We will verify and contact you.</p>
  `);
});

/* ===== ADMIN ===== */
app.get("/admin", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) {
    return res.send("Unauthorized");
  }

  db.all("SELECT * FROM orders ORDER BY id DESC", (err, rows) => {
    let html = `
      <h2>Admin Panel</h2>
      <table border="1" cellpadding="5">
      <tr>
        <th>ID</th>
        <th>Order ID</th>
        <th>UTR</th>
        <th>Date</th>
      </tr>
    `;

    rows.forEach(r => {
      html += `
        <tr>
          <td>${r.id}</td>
          <td>${r.order_id}</td>
          <td>${r.utr}</td>
          <td>${r.created_at}</td>
        </tr>
      `;
    });

    html += "</table>";
    res.send(html);
  });
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Web service running on port", PORT);
});
