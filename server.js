const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const Database = require("better-sqlite3");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.8-flash";


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);
app.set("trust proxy", 1);

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "bankguard-ai-session-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure:
                process.env.NODE_ENV === "production",

            sameSite: "lax",

            maxAge:
                24 * 60 * 60 * 1000
        }
    })
);


// ============================================================
// DATABASE LOCATION
// ============================================================

const dataDirectory =
    path.join(
        __dirname,
        "data"
    );

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(
        dataDirectory,
        {
            recursive: true
        }
    );
}

const dbPath =
    path.join(
        dataDirectory,
        "bankguard.db"
    );


// ============================================================
// DATABASE CONNECTION
// ============================================================

const db =
    new Database(dbPath);

db.pragma(
    "foreign_keys = ON"
);

console.log(
    "SQLite database connected"
);


// ============================================================
// DATABASE TABLES
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        account_number TEXT NOT NULL,
        branch TEXT,
        city TEXT,
        online_registered INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id)
            REFERENCES customers(customer_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        merchant TEXT NOT NULL,
        status TEXT NOT NULL,
        debit_status TEXT,
        refund_status TEXT,
        transaction_date TEXT NOT NULL,
        FOREIGN KEY (customer_id)
            REFERENCES customers(customer_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS disputes (
        dispute_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
        issue TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'OPEN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id)
            REFERENCES customers(customer_id)
    )
`);

console.log(
    "BankGuard database tables ready"
);


// ============================================================
// DATABASE MIGRATION
// ============================================================

function addColumnIfMissing(
    tableName,
    columnName,
    columnDefinition
) {
    const columns =
        db
            .prepare(
                `PRAGMA table_info(${tableName})`
            )
            .all();

    const exists =
        columns.some(
            column =>
                column.name ===
                columnName
        );

    if (!exists) {
        console.log(
            `Adding ${tableName}.${columnName}...`
        );

        db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName}
            ${columnDefinition}
        `);

        console.log(
            `${tableName}.${columnName} added successfully.`
        );
    } else {
        console.log(
            `${tableName}.${columnName} already exists.`
        );
    }
}

console.log(
    "Checking BankGuard database structure..."
);

addColumnIfMissing(
    "transactions",
    "transaction_date",
    "TEXT"
);

addColumnIfMissing(
    "disputes",
    "created_at",
    "TEXT"
);

console.log(
    "BankGuard database migration completed"
);


// ============================================================
// CUSTOMER MASTER
// ============================================================

const MASTER_CUSTOMERS = [
    {
        customerId: "BG1001",
        name: "Aishwarya",
        mobile: "9000001001",
        email:
            "aishwarya@bankguard.demo",
        accountNumber:
            "BGAC10010001",
        branch:
            "BankGuard Central",
        city:
            "Bengaluru"
    },
    {
        customerId: "BG1002",
        name: "Ashwini",
        mobile: "9000001002",
        email:
            "ashwini@bankguard.demo",
        accountNumber:
            "BGAC10020002",
        branch:
            "BankGuard Central",
        city:
            "Bengaluru"
    },
    {
        customerId: "BG1003",
        name: "Priya",
        mobile: "9000001003",
        email:
            "priya@bankguard.demo",
        accountNumber:
            "BGAC10030003",
        branch:
            "BankGuard South",
        city:
            "Bengaluru"
    },
    {
        customerId: "BG1004",
        name: "Rahul",
        mobile: "9000001004",
        email:
            "rahul@bankguard.demo",
        accountNumber:
            "BGAC10040004",
        branch:
            "BankGuard South",
        city:
            "Bengaluru"
    },
    {
        customerId: "BG1005",
        name: "bob",
        mobile: "8907645634",
        email:
            "bob@bankguard.demo",
        accountNumber:
            "BGAC10050001",
        branch:
            "BankGuard Central",
        city:
            "Bengaluru"
    }
];


// ============================================================
// SEED CUSTOMERS
// ============================================================

function seedCustomers() {
    const statement =
        db.prepare(`
            INSERT OR IGNORE INTO customers
            (
                customer_id,
                name,
                mobile,
                email,
                account_number,
                branch,
                city,
                online_registered
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, 0)
        `);

    const insertMany =
        db.transaction(
            customers => {
                for (
                    const customer
                    of customers
                ) {
                    statement.run(
                        customer.customerId,
                        customer.name,
                        customer.mobile,
                        customer.email,
                        customer.accountNumber,
                        customer.branch,
                        customer.city
                    );
                }
            }
        );

    insertMany(
        MASTER_CUSTOMERS
    );

    console.log(
        "BankGuard customer master ready"
    );
}

seedCustomers();

// ============================================================
// SEED DEMO CUSTOMER LOGIN ACCOUNTS
// ============================================================

function seedDemoCustomerUsers() {
    const demoPassword = "123456";

    const customers = [
        {
            customerId: "BG1001",
            name: "Aishwarya",
            email: "aishwarya@bankguard.demo"
        },
        {
            customerId: "BG1002",
            name: "Ashwini",
            email: "ashwini@bankguard.demo"
        },
        {
            customerId: "BG1003",
            name: "Priya",
            email: "priya@bankguard.demo"
        },
        {
            customerId: "BG1004",
            name: "Rahul",
            email: "rahul@bankguard.demo"
        },
        {
            customerId: "BG1005",
            name: "bob",
            email: "bob@bankguard.demo"
        }
    ];

    const passwordHash =
        bcrypt.hashSync(
            demoPassword,
            10
        );

    for (const customer of customers) {
        const existingUser =
            db.prepare(`
                SELECT
                    user_id
                FROM users
                WHERE customer_id = ?
                   OR LOWER(email) = LOWER(?)
            `).get(
                customer.customerId,
                customer.email
            );

        if (existingUser) {
            continue;
        }

        db.prepare(`
            INSERT INTO users
            (
                customer_id,
                name,
                email,
                password_hash,
                role,
                created_at
            )
            VALUES
            (?, ?, ?, ?, 'customer', ?)
        `).run(
            customer.customerId,
            customer.name,
            customer.email,
            passwordHash,
            new Date().toISOString()
        );

        console.log(
            `Demo customer login created: ${customer.email}`
        );
    }
}

seedDemoCustomerUsers();
// ============================================================
// TRANSACTION DATA
// ============================================================

const TRANSACTIONS = [
    [
        "TXN1001",
        "BG1001",
        "UPI",
        2000,
        "ABC Store",
        "FAILED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-27"
    ],
    [
        "TXN1002",
        "BG1001",
        "UPI",
        1500,
        "XYZ Restaurant",
        "SUCCESS",
        "DEBITED",
        "NOT_APPLICABLE",
        "2026-09-26"
    ],
    [
        "TXN1003",
        "BG1001",
        "ATM",
        5000,
        "ATM-001",
        "CASH_NOT_RECEIVED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-25"
    ],
    [
        "TXN1004",
        "BG1001",
        "CARD",
        3500,
        "Online Mart",
        "DUPLICATE",
        "DEBITED_TWICE",
        "PENDING",
        "2026-09-24"
    ],
    [
        "TXN1005",
        "BG1001",
        "UPI",
        800,
        "Coffee Shop",
        "REVERSED",
        "DEBITED",
        "REFUNDED",
        "2026-09-23"
    ],

    [
        "TXN2001",
        "BG1002",
        "UPI",
        1200,
        "ABC Pharmacy",
        "FAILED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-27"
    ],
    [
        "TXN2002",
        "BG1002",
        "CARD",
        2500,
        "Fashion Hub",
        "SUCCESS",
        "DEBITED",
        "NOT_APPLICABLE",
        "2026-09-26"
    ],
    [
        "TXN2003",
        "BG1002",
        "ATM",
        3000,
        "ATM-007",
        "CASH_NOT_RECEIVED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-25"
    ],
    [
        "TXN2004",
        "BG1002",
        "UPI",
        800,
        "Coffee Corner",
        "SUCCESS",
        "DEBITED",
        "NOT_APPLICABLE",
        "2026-09-24"
    ],

    [
        "TXN3001",
        "BG1003",
        "UPI",
        1800,
        "Book World",
        "SUCCESS",
        "DEBITED",
        "PENDING",
        "2026-09-27"
    ],
    [
        "TXN3002",
        "BG1003",
        "CARD",
        4200,
        "Electro Store",
        "DUPLICATE",
        "DEBITED_TWICE",
        "PENDING",
        "2026-09-26"
    ],
    [
        "TXN3003",
        "BG1003",
        "UPI",
        650,
        "Food Point",
        "SUCCESS",
        "DEBITED",
        "REFUNDED",
        "2026-09-25"
    ],

    [
        "TXN4001",
        "BG1004",
        "UPI",
        900,
        "Grocery Mart",
        "SUCCESS",
        "DEBITED",
        "NOT_APPLICABLE",
        "2026-09-27"
    ],
    [
        "TXN4002",
        "BG1004",
        "UPI",
        2200,
        "Travel Booking",
        "FAILED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-26"
    ],
    [
        "TXN4003",
        "BG1004",
        "CARD",
        1500,
        "Sports Store",
        "SUCCESS",
        "DEBITED",
        "NOT_APPLICABLE",
        "2026-09-25"
    ],
    [
        "TXN4004",
        "BG1004",
        "ATM",
        4000,
        "ATM-012",
        "CASH_NOT_RECEIVED",
        "DEBITED",
        "NOT_REFUNDED",
        "2026-09-24"
    ],

    [
        "TXN1790521637953",
        "BG1005",
        "UPI",
        9000,
        "atm",
        "CASH_NOT_RECEIVED",
        "NOT_DEBITED",
        "NOT_REFUNDED",
        "2026-09-10"
    ]
];



// ============================================================
// SEED TRANSACTIONS
// ============================================================

function seedTransactions() {
    const statement =
        db.prepare(`
            INSERT OR IGNORE INTO transactions
            (
                transaction_id,
                customer_id,
                type,
                amount,
                merchant,
                status,
                debit_status,
                refund_status,
                transaction_date
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const insertMany =
        db.transaction(
            transactions => {
                for (
                    const transaction
                    of transactions
                ) {
                    statement.run(
                        ...transaction
                    );
                }
            }
        );

    insertMany(
        TRANSACTIONS
    );

    console.log(
        "BankGuard transaction data ready"
    );
}

seedTransactions();

// ============================================================
// SEED DEMO DISPUTE
// ============================================================

function seedDemoDispute() {
    const existingDispute =
        db.prepare(`
            SELECT dispute_id
            FROM disputes
            WHERE customer_id = ?
            AND transaction_id = ?
            AND status IN ('OPEN', 'IN_PROGRESS')
        `).get(
            "BG1005",
            "TXN1790521637953"
        );

    if (existingDispute) {
        return;
    }

    db.prepare(`
        INSERT INTO disputes
        (
            customer_id,
            transaction_id,
            issue,
            description,
            status,
            created_at
        )
        VALUES
        (?, ?, ?, ?, 'OPEN', ?)
    `).run(
        "BG1005",
        "TXN1790521637953",
        "CASH_NOT_RECEIVED",
        "ATM cash was not received even though the transaction was initiated.",
        new Date().toISOString()
    );

    console.log(
        "BankGuard demo dispute ready"
    );
}

seedDemoDispute();
// ============================================================
// GEMINI INITIALIZATION
// ============================================================

let gemini = null;

if (
    process.env.GEMINI_API_KEY
) {
    try {
        gemini =
            new GoogleGenAI({
                apiKey:
                    process.env.GEMINI_API_KEY
            });

        console.log(
            "Gemini AI enabled"
        );

        console.log(
            `Gemini model: ${GEMINI_MODEL}`
        );
    } catch (error) {
        console.error(
            "Gemini initialization failed:",
            error
        );
    }
} else {
    console.log(
        "Gemini AI disabled - GEMINI_API_KEY not found"
    );
}


// ============================================================
// ADMIN CREATION
// ============================================================

function ensureAdmin() {
    const adminEmail =
        (
            process.env.ADMIN_EMAIL ||
            "admin@bankguard.demo"
        )
            .trim()
            .toLowerCase();

    const adminPassword =
        process.env.ADMIN_PASSWORD ||
        "Admin@123";

    const existingAdmin =
        db.prepare(`
            SELECT
                user_id,
                email,
                role
            FROM users
            WHERE LOWER(email) = LOWER(?)
              AND role = 'admin'
        `).get(
            adminEmail
        );

    if (existingAdmin) {
    const passwordHash =
        bcrypt.hashSync(
            adminPassword,
            10
        );

    db.prepare(`
        UPDATE users
        SET
            password_hash = ?,
            name = ?
        WHERE user_id = ?
          AND role = 'admin'
    `).run(
        passwordHash,
        "BankGuard Administrator",
        existingAdmin.user_id
    );

    console.log(
        "BankGuard admin password synchronized"
    );

    console.log(
        `Admin email: ${adminEmail}`
    );

    return;
}

    const existingEmail =
        db.prepare(`
            SELECT
                user_id,
                customer_id,
                role
            FROM users
            WHERE LOWER(email) = LOWER(?)
        `).get(
            adminEmail
        );

    if (existingEmail) {
        console.log(
            "The configured admin email already belongs to another BankGuard user."
        );

        console.log(
            "Please use a different ADMIN_EMAIL in .env."
        );

        return;
    }

    const passwordHash =
        bcrypt.hashSync(
            adminPassword,
            10
        );

    db.prepare(`
        INSERT INTO users
        (
            customer_id,
            name,
            email,
            password_hash,
            role,
            created_at
        )
        VALUES
        (NULL, ?, ?, ?, 'admin', ?)
    `).run(
        "BankGuard Administrator",
        adminEmail,
        passwordHash,
        new Date().toISOString()
    );

    console.log(
        "BankGuard admin created successfully"
    );

    console.log(
        `Admin email: ${adminEmail}`
    );
}

ensureAdmin();


// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function requireLogin(
    req,
    res,
    next
) {
    if (
        !req.session ||
        !req.session.userId
    ) {
        return res.status(401).json({
            success: false,
            message:
                "Please login first."
        });
    }

    next();
}


function requireCustomer(
    req,
    res,
    next
) {
    if (
        !req.session ||
        !req.session.userId ||
        req.session.role !==
            "customer"
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Customer access required."
        });
    }

    next();
}


function requireAdmin(
    req,
    res,
    next
) {
    if (
        !req.session ||
        !req.session.userId ||
        req.session.role !==
            "admin"
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Administrator access required."
        });
    }

    next();
}


// ============================================================
// HEALTH
// ============================================================

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            success: true,
            service:
                "BankGuard AI",
            status:
                "running",
            gemini:
                gemini !== null,
            model:
                GEMINI_MODEL
        });
    }
);


// ============================================================
// CURRENT SESSION
// ============================================================

app.get(
    "/api/session",
    (req, res) => {
        if (
            !req.session ||
            !req.session.userId
        ) {
            return res.json({
                success: true,
                loggedIn: false
            });
        }

        return res.json({
            success: true,
            loggedIn: true,
            user: {
                id:
                    req.session.userId,
                name:
                    req.session.name,
                email:
                    req.session.email,
                role:
                    req.session.role,
                customerId:
                    req.session.customerId ||
                    null
            }
        });
    }
);


// ============================================================
// CUSTOMER REGISTRATION
// ============================================================

app.post(
    "/api/register",
    async (req, res) => {
        try {
            const {
                customerId,
                name,
                mobile,
                email,
                accountNumber,
                password
            } = req.body;

            if (
                !customerId ||
                !name ||
                !mobile ||
                !email ||
                !accountNumber ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "All registration fields are required."
                });
            }

            const cleanCustomerId =
                String(customerId)
                    .trim()
                    .toUpperCase();

            const cleanName =
                String(name)
                    .trim();

            const cleanMobile =
                String(mobile)
                    .trim();

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            const cleanAccountNumber =
                String(accountNumber)
                    .trim()
                    .toUpperCase();

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(cleanEmail)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid email address."
                });
            }

            if (
                String(password).length <
                6
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 6 characters."
                });
            }

            const customer =
                db.prepare(`
                    SELECT *
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    cleanCustomerId
                );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Customer ID was not found in the BankGuard customer master."
                });
            }

            const matches =
                customer.name
                    .trim()
                    .toLowerCase() ===
                    cleanName
                        .toLowerCase() &&
                customer.mobile ===
                    cleanMobile &&
                customer.email
                    .trim()
                    .toLowerCase() ===
                    cleanEmail &&
                customer.account_number
                    .trim()
                    .toUpperCase() ===
                    cleanAccountNumber;

            if (!matches) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The entered customer details do not match our BankGuard customer records."
                });
            }

            const existingUser =
                db.prepare(`
                    SELECT user_id
                    FROM users
                    WHERE customer_id = ?
                       OR LOWER(email) = LOWER(?)
                `).get(
                    cleanCustomerId,
                    cleanEmail
                );

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This customer is already registered. Please login instead."
                });
            }

            const passwordHash =
                await bcrypt.hash(
                    String(password),
                    10
                );

            db.prepare(`
                INSERT INTO users
                (
                    customer_id,
                    name,
                    email,
                    password_hash,
                    role,
                    created_at
                )
                VALUES
                (?, ?, ?, ?, 'customer', ?)
            `).run(
                customer.customer_id,
                customer.name,
                cleanEmail,
                passwordHash,
                new Date().toISOString()
            );

            db.prepare(`
                UPDATE customers
                SET online_registered = 1
                WHERE customer_id = ?
            `).run(
                customer.customer_id
            );

            return res.json({
                success: true,
                message:
                    "Registration successful. Please login to continue.",
                redirect:
                    "login",
                customer: {
                    customerId:
                        customer.customer_id,
                    name:
                        customer.name,
                    email:
                        customer.email,
                    accountNumber:
                        customer.account_number,
                    branch:
                        customer.branch,
                    city:
                        customer.city
                }
            });
        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Registration failed."
            });
        }
    }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    async (req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });
            }

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            const user =
                db.prepare(`
                    SELECT *
                    FROM users
                    WHERE LOWER(email) = LOWER(?)
                `).get(
                    cleanEmail
                );

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }

            const passwordMatches =
                await bcrypt.compare(
                    String(password),
                    user.password_hash
                );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }

            req.session.userId =
                user.user_id;

            req.session.name =
                user.name;

            req.session.email =
                user.email;

            req.session.role =
                user.role;

            req.session.customerId =
                user.customer_id ||
                null;

            if (
                user.role ===
                "admin"
            ) {
                return res.json({
                    success: true,
                    message:
                        "Admin login successful.",
                    redirect:
                        "admin",
                    user: {
                        id:
                            user.user_id,
                        name:
                            user.name,
                        email:
                            user.email,
                        role:
                            "admin",
                        customerId:
                            null
                    }
                });
            }

            return res.json({
                success: true,
                message:
                    "Login successful.",
                redirect:
                    "home",
                user: {
                    id:
                        user.user_id,
                    name:
                        user.name,
                    email:
                        user.email,
                    role:
                        "customer",
                    customerId:
                        user.customer_id
                }
            });
        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Login failed."
            });
        }
    }
);


// ============================================================
// LOGOUT
// ============================================================

app.post(
    "/api/logout",
    (req, res) => {
        req.session.destroy(
            error => {
                if (error) {
                    console.error(
                        "Logout error:",
                        error
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Logout failed."
                    });
                }

                res.clearCookie(
                    "connect.sid"
                );

                return res.json({
                    success: true,
                    message:
                        "Logged out successfully."
                });
            }
        );
    }
);


// ============================================================
// CUSTOMER PROFILE
// ============================================================

app.get(
    "/api/profile",
    requireCustomer,
    (req, res) => {
        try {
            const customer =
                db.prepare(`
                    SELECT
                        customer_id,
                        name,
                        mobile,
                        email,
                        account_number,
                        branch,
                        city,
                        online_registered
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    req.session.customerId
                );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Customer profile not found."
                });
            }

            return res.json({
                success: true,
                profile:
                    customer
            });
        } catch (error) {
            console.error(
                "Profile error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load profile."
            });
        }
    }
);

// ============================================================
// ACCOUNT SUMMARY
// ============================================================

app.get(
    "/api/account-summary",
    requireCustomer,
    (req, res) => {

        try {

            const customerId =
                req.session.customerId;


            // ==================================================
            // CUSTOMER
            // ==================================================

            const customer =
                db.prepare(`
                    SELECT
                        customer_id,
                        name,
                        mobile,
                        email,
                        account_number,
                        branch,
                        city
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    customerId
                );


            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer account not found."
                });

            }


            // ==================================================
            // TOTAL TRANSACTIONS
            // ==================================================

            const totalTransactions =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM transactions
                    WHERE customer_id = ?
                `).get(
                    customerId
                ).count;


            // ==================================================
            // FAILED / ATM ISSUES
            //
            // Failed transactions:
            //      status = FAILED
            //
            // ATM cash issues:
            //      status = CASH_NOT_RECEIVED
            // ==================================================

            const failedTransactions =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM transactions
                    WHERE customer_id = ?
                    AND status IN (
                        'FAILED',
                        'CASH_NOT_RECEIVED'
                    )
                `).get(
                    customerId
                ).count;


            // ==================================================
            // PENDING REFUNDS
            //
            // Only explicitly pending refunds are counted.
            // NOT_REFUNDED does NOT mean a refund is currently
            // pending.
            // ==================================================

            const pendingRefunds =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM transactions
                    WHERE customer_id = ?
                    AND refund_status = 'PENDING'
                `).get(
                    customerId
                ).count;


            // ==================================================
            // OPEN DISPUTES
            //
            // OPEN and IN_PROGRESS are considered active/open.
            // ==================================================

            const openDisputes =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM disputes
                    WHERE customer_id = ?
                    AND status IN (
                        'OPEN',
                        'IN_PROGRESS'
                    )
                `).get(
                    customerId
                ).count;


            // ==================================================
            // TOTAL DEBITED
            // ==================================================

            const totalDebited =
                db.prepare(`
                    SELECT COALESCE(
                        SUM(amount),
                        0
                    ) AS total
                    FROM transactions
                    WHERE customer_id = ?
                    AND debit_status = 'DEBITED'
                `).get(
                    customerId
                ).total;


            // ==================================================
            // ACCOUNT INFORMATION
            // ==================================================

            const account = {

                customerId:
                    customer.customer_id,

                name:
                    customer.name,

                mobile:
                    customer.mobile,

                email:
                    customer.email,

                accountNumber:
                    customer.account_number,

                branch:
                    customer.branch,

                city:
                    customer.city,

                transactionCount:
                    totalTransactions,

                openDisputes,

                totalDebited
            };


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                success: true,

                summary: {

                    totalTransactions,

                    failedTransactions,

                    pendingRefunds,

                    openDisputes
                },

                account,

                customer:
                    account
            });


        } catch (error) {

            console.error(
                "Account summary error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not load account summary."
            });

        }

    }
);
// ============================================================
// GET CUSTOMER TRANSACTIONS
// ============================================================

function getCustomerTransactions(
    customerId
) {
    return db.prepare(`
        SELECT
            transaction_id,
            customer_id,
            type,
            amount,
            merchant,
            status,
            debit_status,
            refund_status,
            transaction_date
        FROM transactions
        WHERE customer_id = ?
        ORDER BY
            transaction_date DESC
    `).all(
        customerId
    );
}


app.get(
    "/api/transactions",
    requireCustomer,
    (req, res) => {
        try {
            return res.json({
                success: true,
                transactions:
                    getCustomerTransactions(
                        req.session.customerId
                    )
            });
        } catch (error) {
            console.error(
                "Transactions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transactions."
            });
        }
    }
);


// Compatibility endpoint
app.get(
    "/api/my-transactions",
    requireCustomer,
    (req, res) => {
        try {
            return res.json({
                success: true,
                transactions:
                    getCustomerTransactions(
                        req.session.customerId
                    )
            });
        } catch (error) {
            console.error(
                "My transactions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transactions."
            });
        }
    }
);


// ============================================================
// FIND ONE CUSTOMER TRANSACTION
// ============================================================

function findCustomerTransaction(
    customerId,
    transactionId
) {
    return db.prepare(`
        SELECT
            transaction_id,
            customer_id,
            type,
            amount,
            merchant,
            status,
            debit_status,
            refund_status,
            transaction_date
        FROM transactions
        WHERE transaction_id = ?
        AND customer_id = ?
    `).get(
        transactionId,
        customerId
    );
}


app.get(
    "/api/transactions/:transactionId",
    requireCustomer,
    (req, res) => {
        try {
            const transaction =
                findCustomerTransaction(
                    req.session.customerId,
                    req.params.transactionId
                );

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Transaction not found."
                });
            }

            return res.json({
                success: true,
                transaction
            });
        } catch (error) {
            console.error(
                "Transaction lookup error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transaction."
            });
        }
    }
);


// Compatibility endpoint
app.get(
    "/api/my-transactions/:transactionId",
    requireCustomer,
    (req, res) => {
        try {
            const transaction =
                findCustomerTransaction(
                    req.session.customerId,
                    req.params.transactionId
                );

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Transaction not found."
                });
            }

            return res.json({
                success: true,
                transaction
            });
        } catch (error) {
            console.error(
                "My transaction lookup error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transaction."
            });
        }
    }
);

// ============================================================
// CREATE DISPUTE
// ============================================================

function createDisputeHandler(req, res) {
    try {
        console.log("");
        console.log("================================");
        console.log(">>> CREATE DISPUTE ROUTE HIT <<<");
        console.log("================================");

        console.log(
            "Logged-in customer:",
            req.session.customerId
        );

        console.log(
            "Request body:",
            req.body
        );

        const {
            transactionId,
            issue,
            description
        } = req.body;

        // --------------------------------------------------------
        // VALIDATE INPUT
        // --------------------------------------------------------

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Transaction ID is required."
            });
        }

        if (!issue || !String(issue).trim()) {
            return res.status(400).json({
                success: false,
                message:
                    "Please select or enter the issue."
            });
        }

        // --------------------------------------------------------
        // CLEAN TRANSACTION ID
        // --------------------------------------------------------

        const cleanTransactionId =
            String(transactionId)
                .trim()
                .toUpperCase();

        console.log(
            "Checking transaction:",
            cleanTransactionId
        );

        // --------------------------------------------------------
        // VERIFY TRANSACTION BELONGS TO LOGGED-IN CUSTOMER
        // --------------------------------------------------------

        const transaction =
            findCustomerTransaction(
                req.session.customerId,
                cleanTransactionId
            );

        if (!transaction) {
            console.log(
                "Transaction not found for customer:",
                req.session.customerId
            );

            return res.status(404).json({
                success: false,
                message:
                    "Transaction not found or does not belong to your account."
            });
        }

        console.log(
            "Verified transaction:",
            transaction
        );

        // --------------------------------------------------------
        // CHECK FOR EXISTING OPEN DISPUTE
        // --------------------------------------------------------

        const existingDispute =
            db.prepare(`
                SELECT
                    dispute_id,
                    status
                FROM disputes
                WHERE customer_id = ?
                AND transaction_id = ?
                AND status IN (
                    'OPEN',
                    'IN_PROGRESS'
                )
            `).get(
                req.session.customerId,
                transaction.transaction_id
            );

        if (existingDispute) {
            return res.status(409).json({
                success: false,
                message:
                    "An active dispute already exists for this transaction.",
                disputeId:
                    existingDispute.dispute_id
            });
        }

        // --------------------------------------------------------
        // DESCRIPTION
        // --------------------------------------------------------

        const cleanDescription =
            description
                ? String(description).trim()
                : "";

        // --------------------------------------------------------
        // CREATE DISPUTE
        // --------------------------------------------------------

        const result =
            db.prepare(`
                INSERT INTO disputes
                (
                    customer_id,
                    transaction_id,
                    issue,
                    description,
                    status,
                    created_at
                )
                VALUES
                (?, ?, ?, ?, 'OPEN', ?)
            `).run(
                req.session.customerId,
                transaction.transaction_id,
                String(issue).trim(),
                cleanDescription,
                new Date().toISOString()
            );

        console.log(
            "Dispute created successfully."
        );

        console.log(
            "Dispute ID:",
            result.lastInsertRowid
        );

        return res.json({
            success: true,
            message:
                "Dispute submitted successfully.",
            disputeId:
                Number(result.lastInsertRowid),
            transactionId:
                transaction.transaction_id,
            status:
                "OPEN"
        });

    } catch (error) {

        console.error("");
        console.error(
            "================================"
        );
        console.error(
            ">>> CREATE DISPUTE ERROR <<<"
        );
        console.error(
            "================================"
        );

        console.error(
            "Error message:",
            error?.message
        );

        console.error(
            "Full error:",
            error
        );

        console.error(
            "================================"
        );

        return res.status(500).json({
            success: false,
            message:
                "Could not create dispute."
        });
    }
}


app.post(
    "/api/disputes",
    requireCustomer,
    createDisputeHandler
);

app.post(
    "/api/dispute",
    requireCustomer,
    createDisputeHandler
);

// ============================================================
// CUSTOMER DISPUTE HISTORY
// ============================================================

app.get(
    "/api/disputes",
    requireCustomer,
    (req, res) => {

        try {

            const disputes =
                db.prepare(`
                    SELECT
                        d.dispute_id,
                        d.customer_id,
                        d.transaction_id,
                        d.issue,
                        d.description,
                        d.status,
                        d.created_at,

                        t.type,
                        t.amount,
                        t.merchant,
                        t.status AS transaction_status,
                        t.debit_status,
                        t.refund_status,
                        t.transaction_date

                    FROM disputes d

                    LEFT JOIN transactions t
                    ON d.transaction_id =
                       t.transaction_id

                    WHERE d.customer_id = ?

                    ORDER BY
                        d.created_at DESC
                `).all(
                    req.session.customerId
                );

            return res.json({
                success: true,

                disputes:
                    disputes.map(
                        dispute => ({
                            ...dispute,

                            complaint:
                                dispute.description,

                            displayStatus:
                                String(
                                    dispute.status ||
                                    "OPEN"
                                ).toUpperCase()
                        })
                    )
            });

        } catch (error) {

            console.error(
                "Dispute history error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load dispute history."
            });
        }
    }
);


// ============================================================
// VERIFY TRANSACTION
// ============================================================

app.post(
    "/api/verify-transaction",
    requireCustomer,
    (req, res) => {
        try {
            const {
                transactionId
            } = req.body;

            if (!transactionId) {
                return res.status(400).json({
                    success: false,
                    verified: false,
                    message:
                        "Transaction ID is required."
                });
            }

            const transaction =
                findCustomerTransaction(
                    req.session.customerId,
                    String(transactionId)
                        .trim()
                        .toUpperCase()
                );

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    verified: false,
                    message:
                        "Transaction was not found in your account."
                });
            }

            return res.json({
                success: true,
                verified: true,
                transaction
            });
        } catch (error) {
            console.error(
                "Transaction verification error:",
                error
            );

            return res.status(500).json({
                success: false,
                verified: false,
                message:
                    "Transaction verification failed."
            });
        }
    }
);


// ============================================================
// DETERMINISTIC BANKING RESPONSE
// ============================================================

function buildDeterministicBankingResponse(
    transaction,
    userMessage
) {
    const amount =
        Number(
            transaction.amount
        ).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    const status =
        String(
            transaction.status ||
            ""
        ).toUpperCase();

    const debitStatus =
        String(
            transaction.debit_status ||
            ""
        ).toUpperCase();

    const refundStatus =
        String(
            transaction.refund_status ||
            ""
        ).toUpperCase();

    const transactionId =
        transaction.transaction_id;

    const merchant =
        transaction.merchant;

    const type =
        transaction.type;

    console.log(
        "Building deterministic response for:",
        transactionId
    );

    // --------------------------------------------------------
    // FAILED TRANSACTION
    // --------------------------------------------------------

    if (
        status === "FAILED"
    ) {
        if (
            debitStatus ===
                "DEBITED" &&
            refundStatus ===
                "NOT_REFUNDED"
        ) {
            return (
                `Transaction ${transactionId} was a failed ` +
                `${type} transaction for ₹${amount} at ${merchant}. ` +
                `The transaction failed, but the amount was debited ` +
                `from your account and the refund status is currently ` +
                `NOT_REFUNDED. Please keep the transaction ID for ` +
                `reference and monitor the refund status.`
            );
        }

        return (
            `Transaction ${transactionId} was a failed ` +
            `${type} transaction for ₹${amount} at ${merchant}. ` +
            `The current transaction status is ${status}. ` +
            `Please keep the transaction ID for reference.`
        );
    }


    // --------------------------------------------------------
    // ATM CASH NOT RECEIVED
    // --------------------------------------------------------

    if (
        status ===
            "CASH_NOT_RECEIVED"
    ) {
        return (
            `Transaction ${transactionId} is an ATM transaction ` +
            `for ₹${amount} at ${merchant}. The transaction shows ` +
            `CASH_NOT_RECEIVED, while the debit status is ` +
            `${debitStatus || "not specified"} and the refund status ` +
            `is ${refundStatus || "not specified"}. This means the ` +
            `account was debited but cash was not received. Please ` +
            `raise a dispute using transaction ID ${transactionId}.`
        );
    }


    // --------------------------------------------------------
    // DUPLICATE TRANSACTION
    // --------------------------------------------------------

    if (
        status ===
            "DUPLICATE" ||
        debitStatus ===
            "DEBITED_TWICE"
    ) {
        return (
            `Transaction ${transactionId} appears as a duplicate ` +
            `${type} transaction for ₹${amount} at ${merchant}. ` +
            `The debit status is ${debitStatus || "not specified"} ` +
            `and the refund status is ${refundStatus || "not specified"}. ` +
            `If you were charged twice, you can raise a dispute ` +
            `for this transaction.`
        );
    }


    // --------------------------------------------------------
    // REVERSED TRANSACTION
    // --------------------------------------------------------

    if (
        status ===
            "REVERSED"
    ) {
        if (
            refundStatus ===
                "REFUNDED"
        ) {
            return (
                `Transaction ${transactionId} was a reversed ` +
                `${type} transaction for ₹${amount} at ${merchant}. ` +
                `The transaction has been marked as refunded, so the ` +
                `refund status is REFUNDED.`
            );
        }

        return (
            `Transaction ${transactionId} was a reversed ` +
            `${type} transaction for ₹${amount} at ${merchant}. ` +
            `The current refund status is ${refundStatus || "not specified"}.`
        );
    }


    // --------------------------------------------------------
    // SUCCESSFUL TRANSACTION
    // --------------------------------------------------------

    if (
        status ===
            "SUCCESS"
    ) {
        if (
            refundStatus ===
                "REFUNDED"
        ) {
            return (
                `Transaction ${transactionId} was a successful ` +
                `${type} transaction for ₹${amount} at ${merchant}. ` +
                `The transaction amount was debited and the refund ` +
                `status is REFUNDED.`
            );
        }

        if (
            refundStatus ===
                "PENDING"
        ) {
            return (
                `Transaction ${transactionId} was a successful ` +
                `${type} transaction for ₹${amount} at ${merchant}. ` +
                `The amount was debited successfully, while the ` +
                `refund status is currently PENDING.`
            );
        }

        return (
            `Transaction ${transactionId} was a successful ` +
            `${type} transaction for ₹${amount} at ${merchant}. ` +
            `The debit status is ${debitStatus || "not specified"}.`
        );
    }


    // --------------------------------------------------------
    // GENERIC VERIFIED TRANSACTION
    // --------------------------------------------------------

    return (
        `I found transaction ${transactionId}. It is a ` +
        `${type} transaction for ₹${amount} at ${merchant}. ` +
        `Its current status is ${status || "not specified"}, ` +
        `with debit status ${debitStatus || "not specified"} ` +
        `and refund status ${refundStatus || "not specified"}.`
    );
}


// ============================================================
// GENERAL DETERMINISTIC RESPONSE
// ============================================================

function buildGeneralBankingResponse(
    userMessage
) {
    const message =
        String(
            userMessage ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        message.includes("refund")
    ) {
        return (
            "I can help check a refund. Please provide your " +
            "transaction ID, for example TXN1001."
        );
    }

    if (
        message.includes("failed") ||
        message.includes("failure")
    ) {
        return (
            "I can check a failed transaction and its debit or refund " +
            "status. Please provide the transaction ID."
        );
    }

    if (
        message.includes("atm") ||
        message.includes("cash")
    ) {
        return (
            "I can check ATM cash-withdrawal issues. Please provide " +
            "the transaction ID."
        );
    }

    if (
        message.includes("duplicate")
    ) {
        return (
            "I can check whether a transaction is marked as duplicate. " +
            "Please provide the transaction ID."
        );
    }

    if (
        message.includes("transaction")
    ) {
        return (
            "I can check your BankGuard transaction details, including " +
            "status, debit status and refund status. Please provide " +
            "your transaction ID, such as TXN1001."
        );
    }

    return (
        "I can help with BankGuard transaction status, failed " +
        "payments, duplicate transactions, ATM cash issues, refunds " +
        "and disputes. Please tell me your issue or provide a " +
        "transaction ID."
    );
}


// ============================================================
// GEMINI CHAT + FALLBACK
// ============================================================

app.post(
    "/api/chat",
    requireCustomer,
    async (req, res) => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            ">>> /api/chat ROUTE HIT <<<"
        );
        console.log(
            "================================"
        );

        try {

            const customerId =
                req.session.customerId;

            const {
                message,
                transactionId
            } = req.body;

            console.log(
                "Logged-in customer:",
                customerId
            );

            console.log(
                "Request body:",
                req.body
            );

            if (
                !message ||
                !String(message).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a message."
                });
            }

            const cleanMessage =
                String(message).trim();


            // ----------------------------------------------------
            // FIND TRANSACTION ID
            // ----------------------------------------------------

            let detectedTransactionId =
                transactionId
                    ? String(
                        transactionId
                    )
                        .trim()
                        .toUpperCase()
                    : null;

            if (
                !detectedTransactionId
            ) {
                const match =
                    cleanMessage.match(
                        /\bTXN\d+\b/i
                    );

                if (match) {
                    detectedTransactionId =
                        match[0]
                            .trim()
                            .toUpperCase();

                    console.log(
                        "Transaction ID detected from message:",
                        detectedTransactionId
                    );
                }
            }


            // ----------------------------------------------------
            // VERIFY TRANSACTION
            // ----------------------------------------------------

            let verifiedTransaction =
                null;

            if (
                detectedTransactionId
            ) {

                console.log(
                    "Checking transaction:",
                    detectedTransactionId
                );

                verifiedTransaction =
                    findCustomerTransaction(
                        customerId,
                        detectedTransactionId
                    );

                if (
                    !verifiedTransaction
                ) {

                    console.log(
                        "Transaction was not found for customer:",
                        customerId
                    );

                    return res.status(404).json({
                        success: false,
                        message:
                            "That transaction was not found in your account."
                    });
                }

                console.log(
                    "Verified transaction:",
                    verifiedTransaction
                );
            }


            // ----------------------------------------------------
            // DETERMINISTIC FALLBACK
            // ----------------------------------------------------

            if (
                verifiedTransaction
            ) {

                const fallbackAnswer =
                    buildDeterministicBankingResponse(
                        verifiedTransaction,
                        cleanMessage
                    );


                // ------------------------------------------------
                // TRY GEMINI FIRST
                // ------------------------------------------------

                if (gemini) {

                    try {

                        const customer =
                            db.prepare(`
                                SELECT
                                    customer_id,
                                    name
                                FROM customers
                                WHERE customer_id = ?
                            `).get(
                                customerId
                            );


                        const transactionContext = `
VERIFIED TRANSACTION

Transaction ID:
${verifiedTransaction.transaction_id}

Type:
${verifiedTransaction.type}

Amount:
₹${verifiedTransaction.amount}

Merchant:
${verifiedTransaction.merchant}

Status:
${verifiedTransaction.status}

Debit Status:
${verifiedTransaction.debit_status}

Refund Status:
${verifiedTransaction.refund_status}

Transaction Date:
${verifiedTransaction.transaction_date}
`;


                        const prompt = `
You are BankGuard AI,
a banking customer-support assistant.

BankGuard is a fictional banking system
used for demonstration purposes.

CUSTOMER

Customer ID:
${customer?.customer_id || customerId}

Customer Name:
${customer?.name || req.session.name}

${transactionContext}

USER QUESTION

${cleanMessage}

RULES

1. Answer clearly and simply.

2. Never invent transaction information.

3. Only discuss transaction details that
were verified from the BankGuard database.

4. Explain failed transactions,
duplicate transactions,
reversed transactions,
refunds,
ATM cash-not-received issues,
and debit status in simple language.

5. Never claim that money was refunded
unless the verified transaction says
the refund status is REFUNDED.

6. If fraud or an unauthorized transaction
is suspected, advise the customer to
contact their bank immediately and
secure their account.

7. Never reveal passwords,
API keys,
session information,
database credentials,
or internal security information.

8. Keep the response concise.

9. Do not invent policies that are not
provided by BankGuard.

Provide the best helpful response
based only on the verified transaction.
`;


                        console.log(
                            "Calling Gemini..."
                        );

                        console.log(
                            "Gemini model:",
                            GEMINI_MODEL
                        );


                        const response =
                            await gemini.models.generateContent({
                                model:
                                    GEMINI_MODEL,
                                contents:
                                    prompt
                            });


                        const answer =
                            response?.text ||
                            response
                                ?.candidates?.[0]
                                ?.content?.parts
                                ?.map(
                                    part =>
                                        part.text ||
                                        ""
                                )
                                .join("") ||
                            "";


                        if (
                            answer.trim()
                        ) {

                            console.log(
                                "Gemini response received successfully."
                            );

                            return res.json({
                                success: true,
                                message:
                                    answer,
                                response:
                                    answer,
                                verified:
                                    true,
                                transaction:
                                    verifiedTransaction,
                                model:
                                    GEMINI_MODEL,
                                aiMode:
                                    "gemini"
                            });
                        }

                    } catch (geminiError) {

                        console.error(
                            "Gemini unavailable. Using deterministic fallback."
                        );

                        console.error(
                            "Gemini error status:",
                            geminiError?.status
                        );

                        console.error(
                            "Gemini error message:",
                            geminiError?.message
                        );
                    }
                }


                // ------------------------------------------------
                // DETERMINISTIC RESPONSE
                // ------------------------------------------------

                console.log(
                    "Returning deterministic transaction response."
                );

                return res.json({
                    success: true,
                    message:
                        fallbackAnswer,
                    response:
                        fallbackAnswer,
                    verified:
                        true,
                    transaction:
                        verifiedTransaction,
                    model:
                        null,
                    aiMode:
                        "deterministic"
                });
            }


            // ----------------------------------------------------
            // NO TRANSACTION ID
            // ----------------------------------------------------

            let generalAnswer =
                buildGeneralBankingResponse(
                    cleanMessage
                );


            // ----------------------------------------------------
            // TRY GEMINI FOR GENERAL QUESTIONS
            // ----------------------------------------------------

            if (gemini) {

                try {

                    const customer =
                        db.prepare(`
                            SELECT
                                customer_id,
                                name
                            FROM customers
                            WHERE customer_id = ?
                        `).get(
                            customerId
                        );


                    const prompt = `
You are BankGuard AI,
a banking customer-support assistant.

BankGuard is a fictional banking system
used for demonstration purposes.

Customer:
${customer?.name || req.session.name}

Customer ID:
${customer?.customer_id || customerId}

User question:
${cleanMessage}

There is no verified transaction attached
to this question.

Rules:

1. Do not invent transaction information.

2. If the user is asking about a specific
transaction, ask them for the transaction ID.

3. Give concise and useful banking guidance.

4. Do not invent BankGuard policies.

5. Never reveal passwords, API keys,
session information or database credentials.

Answer clearly and simply.
`;


                    console.log(
                        "Calling Gemini for general question..."
                    );


                    const response =
                        await gemini.models.generateContent({
                            model:
                                GEMINI_MODEL,
                            contents:
                                prompt
                        });


                    const answer =
                        response?.text ||
                        response
                            ?.candidates?.[0]
                            ?.content?.parts
                            ?.map(
                                part =>
                                    part.text ||
                                    ""
                            )
                            .join("") ||
                        "";


                    if (
                        answer.trim()
                    ) {

                        return res.json({
                            success: true,
                            message:
                                answer,
                            response:
                                answer,
                            verified:
                                false,
                            transaction:
                                null,
                            model:
                                GEMINI_MODEL,
                            aiMode:
                                "gemini"
                        });
                    }

                } catch (geminiError) {

                    console.error(
                        "Gemini unavailable for general question."
                    );

                    console.error(
                        "Gemini error status:",
                        geminiError?.status
                    );

                    console.error(
                        "Gemini error message:",
                        geminiError?.message
                    );
                }
            }


            // ----------------------------------------------------
            // GENERAL DETERMINISTIC RESPONSE
            // ----------------------------------------------------

            console.log(
                "Returning deterministic general response."
            );

            return res.json({
                success: true,
                message:
                    generalAnswer,
                response:
                    generalAnswer,
                verified:
                    false,
                transaction:
                    null,
                model:
                    null,
                aiMode:
                    "deterministic"
            });

        } catch (error) {

            console.error("");
            console.error(
                "================================"
            );
            console.error(
                ">>> CHAT ROUTE ERROR <<<"
            );
            console.error(
                "================================"
            );

            console.error(
                "Error message:",
                error?.message
            );

            console.error(
                "Error status:",
                error?.status
            );

            console.error(
                "Error code:",
                error?.code
            );

            console.error(
                "Full error:",
                error
            );


            // ----------------------------------------------------
            // LAST-RESORT FALLBACK
            // ----------------------------------------------------

            try {

                const message =
                    String(
                        req.body?.message ||
                        ""
                    ).trim();

                const transactionMatch =
                    message.match(
                        /\bTXN\d+\b/i
                    );

                if (
                    transactionMatch
                ) {

                    const transaction =
                        findCustomerTransaction(
                            req.session.customerId,
                            transactionMatch[0]
                                .toUpperCase()
                        );

                    if (
                        transaction
                    ) {

                        const fallback =
                            buildDeterministicBankingResponse(
                                transaction,
                                message
                            );

                        return res.json({
                            success: true,
                            message:
                                fallback,
                            response:
                                fallback,
                            verified:
                                true,
                            transaction,
                            model:
                                null,
                            aiMode:
                                "deterministic"
                        });
                    }
                }

            } catch (
                fallbackError
            ) {

                console.error(
                    "Fallback response error:",
                    fallbackError
                );
            }


            return res.json({
                success: true,
                message:
                    buildGeneralBankingResponse(
                        req.body?.message
                    ),
                response:
                    buildGeneralBankingResponse(
                        req.body?.message
                    ),
                verified:
                    false,
                transaction:
                    null,
                model:
                    null,
                aiMode:
                    "deterministic"
            });
        }
    }
);


// ============================================================
// ADMIN SUMMARY
// ============================================================

app.get(
    "/api/admin/summary",
    requireAdmin,
    (req, res) => {
        try {
            const customers =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM customers
                `).get().count;

            const registeredCustomers =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM users
                    WHERE role = 'customer'
                `).get().count;

            const transactions =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM transactions
                `).get().count;

            const disputes =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM disputes
                `).get().count;

            const openDisputes =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM disputes
                    WHERE status = 'OPEN'
                `).get().count;

            const failedTransactions =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM transactions
                    WHERE status = 'FAILED'
                `).get().count;

            const totalTransactionValue =
                db.prepare(`
                    SELECT COALESCE(
                        SUM(amount),
                        0
                    ) AS total
                    FROM transactions
                `).get().total;

            return res.json({
                success: true,
                stats: {
                    customers,
                    registeredCustomers,
                    transactions,
                    disputes,
                    openDisputes,
                    failedTransactions,
                    totalTransactionValue
                }
            });
        } catch (error) {
            console.error(
                "Admin summary error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load admin summary."
            });
        }
    }
);


// ============================================================
// ADMIN CUSTOMER LIST
// ============================================================

app.get(
    "/api/admin/customers",
    requireAdmin,
    (req, res) => {
        try {
            const customers =
                db.prepare(`
                    SELECT
                        c.customer_id,
                        c.name,
                        c.mobile,
                        c.email,
                        c.account_number,
                        c.branch,
                        c.city,
                        c.online_registered,
                        u.user_id,
                        u.role,
                        u.created_at AS registered_at
                    FROM customers c
                    LEFT JOIN users u
                    ON c.customer_id =
                       u.customer_id
                    ORDER BY
                        c.customer_id
                `).all();

            return res.json({
                success: true,
                customers
            });
        } catch (error) {
            console.error(
                "Admin customers error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load customers."
            });
        }
    }
);


// ============================================================
// ADMIN ADD CUSTOMER
// ============================================================

app.post(
    "/api/admin/customers",
    requireAdmin,
    (req, res) => {
        try {
            const {
                customerId,
                name,
                mobile,
                email,
                accountNumber,
                branch,
                city
            } = req.body;

            if (
                !customerId ||
                !name ||
                !mobile ||
                !email ||
                !accountNumber
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Customer ID, name, mobile, email and account number are required."
                });
            }

            const cleanCustomerId =
                String(customerId)
                    .trim()
                    .toUpperCase();

            const existing =
                db.prepare(`
                    SELECT customer_id
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    cleanCustomerId
                );

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Customer ID already exists."
                });
            }

            db.prepare(`
                INSERT INTO customers
                (
                    customer_id,
                    name,
                    mobile,
                    email,
                    account_number,
                    branch,
                    city,
                    online_registered
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, 0)
            `).run(
                cleanCustomerId,
                String(name).trim(),
                String(mobile).trim(),
                String(email)
                    .trim()
                    .toLowerCase(),
                String(accountNumber)
                    .trim()
                    .toUpperCase(),
                branch
                    ? String(branch).trim()
                    : "",
                city
                    ? String(city).trim()
                    : ""
            );

            return res.json({
                success: true,
                message:
                    "Customer added successfully."
            });
        } catch (error) {
            console.error(
                "Admin add customer error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not add customer."
            });
        }
    }
);


// ============================================================
// ADMIN DELETE CUSTOMER
// ============================================================

app.delete(
    "/api/admin/customers/:customerId",
    requireAdmin,
    (req, res) => {
        try {
            const customerId =
                String(
                    req.params.customerId
                )
                    .trim()
                    .toUpperCase();

            const customer =
                db.prepare(`
                    SELECT customer_id
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    customerId
                );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Customer not found."
                });
            }

            const deleteCustomer =
                db.transaction(() => {

                    db.prepare(`
                        DELETE FROM disputes
                        WHERE customer_id = ?
                    `).run(
                        customerId
                    );

                    db.prepare(`
                        DELETE FROM transactions
                        WHERE customer_id = ?
                    `).run(
                        customerId
                    );

                    db.prepare(`
                        DELETE FROM users
                        WHERE customer_id = ?
                    `).run(
                        customerId
                    );

                    db.prepare(`
                        DELETE FROM customers
                        WHERE customer_id = ?
                    `).run(
                        customerId
                    );
                });

            deleteCustomer();

            return res.json({
                success: true,
                message:
                    "Customer deleted successfully."
            });
        } catch (error) {
            console.error(
                "Admin delete customer error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not delete customer."
            });
        }
    }
);


// ============================================================
// ADMIN DISPUTE LIST
// ============================================================

app.get(
    "/api/admin/disputes",
    requireAdmin,
    (req, res) => {
        try {
            const disputes =
                db.prepare(`
                    SELECT
                        d.dispute_id,
                        d.customer_id,
                        d.transaction_id,
                        d.issue,
                        d.description,
                        d.status,
                        d.created_at,
                        c.name AS customer_name,
                        c.email AS customer_email,
                        t.type,
                        t.amount,
                        t.merchant,
                        t.status AS transaction_status,
                        t.refund_status
                    FROM disputes d
                    LEFT JOIN customers c
                    ON d.customer_id =
                       c.customer_id
                    LEFT JOIN transactions t
                    ON d.transaction_id =
                       t.transaction_id
                    ORDER BY
                        d.created_at DESC
                `).all();

            return res.json({
                success: true,
                disputes
            });
        } catch (error) {
            console.error(
                "Admin disputes error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load disputes."
            });
        }
    }
);

// ============================================================
// ADMIN ACCEPT / REJECT DISPUTE
// ============================================================

app.patch(
    "/api/admin/disputes/:disputeId",
    requireAdmin,
    (req, res) => {
        try {

            console.log("");
            console.log(
                "================================"
            );
            console.log(
                ">>> ADMIN UPDATE DISPUTE <<<"
            );
            console.log(
                "================================"
            );

            const disputeId =
                Number(
                    req.params.disputeId
                );

            const status =
                String(
                    req.body.status ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            console.log(
                "Dispute ID:",
                disputeId
            );

            console.log(
                "Requested status:",
                status
            );

            // ------------------------------------------------
            // VALIDATE DISPUTE ID
            // ------------------------------------------------

            if (
                !Number.isInteger(
                    disputeId
                ) ||
                disputeId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid dispute ID."
                });
            }

            // ------------------------------------------------
            // ONLY ACCEPT OR REJECT
            // ------------------------------------------------

            const allowedStatuses = [
                "ACCEPTED",
                "REJECTED"
            ];

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Dispute status must be ACCEPTED or REJECTED."
                });
            }

            // ------------------------------------------------
            // CHECK DISPUTE EXISTS
            // ------------------------------------------------

            const dispute =
                db.prepare(`
                    SELECT
                        dispute_id,
                        customer_id,
                        transaction_id,
                        issue,
                        status
                    FROM disputes
                    WHERE dispute_id = ?
                `).get(
                    disputeId
                );

            if (!dispute) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Dispute not found."
                });
            }

            console.log(
                "Existing dispute:",
                dispute
            );

            // ------------------------------------------------
            // UPDATE STATUS
            // ------------------------------------------------

            db.prepare(`
                UPDATE disputes
                SET status = ?
                WHERE dispute_id = ?
            `).run(
                status,
                disputeId
            );

            console.log(
                `Dispute ${disputeId} updated to ${status}`
            );

            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({
                success: true,
                message:
                    status === "ACCEPTED"
                        ? "Dispute accepted successfully."
                        : "Dispute rejected successfully.",
                dispute: {
                    disputeId:
                        disputeId,
                    customerId:
                        dispute.customer_id,
                    transactionId:
                        dispute.transaction_id,
                    issue:
                        dispute.issue,
                    status:
                        status
                }
            });

        } catch (error) {

            console.error("");
            console.error(
                "================================"
            );
            console.error(
                ">>> ADMIN UPDATE DISPUTE ERROR <<<"
            );
            console.error(
                "================================"
            );

            console.error(
                "Error message:",
                error?.message
            );

            console.error(
                "Full error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not update dispute."
            });
        }
    }
);

// ============================================================
// ADMIN TRANSACTION CUSTOMERS
// ============================================================

app.get(
    "/api/admin/transaction-customers",
    requireAdmin,
    (req, res) => {
        try {
            const customers =
                db.prepare(`
                    SELECT
                        customer_id,
                        name,
                        email
                    FROM customers
                    ORDER BY
                        name
                `).all();

            return res.json({
                success: true,
                customers
            });
        } catch (error) {
            console.error(
                "Admin transaction customer error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transaction customers."
            });
        }
    }
);


// ============================================================
// ADMIN TRANSACTIONS
// ============================================================

app.get(
    "/api/admin/transactions",
    requireAdmin,
    (req, res) => {
        try {
            const transactions =
                db.prepare(`
                    SELECT
                        t.transaction_id,
                        t.customer_id,
                        c.name AS customer_name,
                        c.email AS customer_email,
                        t.type,
                        t.amount,
                        t.merchant,
                        t.status,
                        t.debit_status,
                        t.refund_status,
                        t.transaction_date
                    FROM transactions t
                    LEFT JOIN customers c
                    ON t.customer_id =
                       c.customer_id
                    ORDER BY
                        t.transaction_date DESC
                `).all();

            return res.json({
                success: true,
                transactions
            });
        } catch (error) {
            console.error(
                "Admin transactions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not load transactions."
            });
        }
    }
);


// ============================================================
// ADMIN ADD TRANSACTION
// ============================================================

app.post(
    "/api/admin/transactions",
    requireAdmin,
    (req, res) => {
        try {
            const {
                customerId,
                type,
                amount,
                merchant,
                status,
                debitStatus,
                refundStatus,
                transactionDate
            } = req.body;

            if (
                !customerId ||
                !type ||
                amount === undefined ||
                amount === null ||
                !merchant ||
                !status ||
                !transactionDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Customer, type, amount, merchant, status and transaction date are required."
                });
            }

            const cleanCustomerId =
                String(customerId)
                    .trim()
                    .toUpperCase();

            const customer =
                db.prepare(`
                    SELECT customer_id
                    FROM customers
                    WHERE customer_id = ?
                `).get(
                    cleanCustomerId
                );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Customer not found."
                });
            }

            const numericAmount =
                Number(amount);

            if (
                !Number.isFinite(
                    numericAmount
                ) ||
                numericAmount < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid transaction amount."
                });
            }

            let transactionId;

            do {
                transactionId =
                    `TXN${Date.now()}${Math.floor(
                        Math.random() * 1000
                    )}`;
            } while (
                db.prepare(`
                    SELECT transaction_id
                    FROM transactions
                    WHERE transaction_id = ?
                `).get(
                    transactionId
                )
            );

            db.prepare(`
                INSERT INTO transactions
                (
                    transaction_id,
                    customer_id,
                    type,
                    amount,
                    merchant,
                    status,
                    debit_status,
                    refund_status,
                    transaction_date
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId,
                customer.customer_id,
                String(type)
                    .trim()
                    .toUpperCase(),
                numericAmount,
                String(merchant)
                    .trim(),
                String(status)
                    .trim()
                    .toUpperCase(),
                debitStatus
                    ? String(debitStatus)
                        .trim()
                        .toUpperCase()
                    : "",
                refundStatus
                    ? String(refundStatus)
                        .trim()
                        .toUpperCase()
                    : "",
                String(transactionDate)
                    .trim()
            );

            return res.json({
                success: true,
                message:
                    "Transaction added successfully.",
                transactionId
            });
        } catch (error) {
            console.error(
                "Admin add transaction error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Could not add transaction."
            });
        }
    }
);


// ============================================================
// STATIC FRONTEND
// ============================================================

const publicDirectory =
    path.join(
        __dirname,
        "public"
    );

app.use(
    express.static(
        publicDirectory
    )
);


// ============================================================
// EXPRESS FALLBACK
// ============================================================

app.use(
    (req, res) => {
        res.sendFile(
            path.join(
                publicDirectory,
                "index.html"
            )
        );
    }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "Unhandled server error:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        return res.status(500).json({
            success: false,
            message:
                "An unexpected server error occurred."
        });
    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {
        console.log("");
        console.log(
            "=============================================="
        );
        console.log(
            "       BANKGUARD AI IS RUNNING"
        );
        console.log(
            "=============================================="
        );
        console.log(
            `Local URL: http://127.0.0.1:${PORT}`
        );
        console.log(
            `Gemini: ${
                gemini
                    ? "Configured"
                    : "Not Configured"
            }`
        );
        console.log(
            `Gemini Model: ${GEMINI_MODEL}`
        );
        console.log(
            "Customer verification: ENABLED"
        );
        console.log(
            "Transaction ownership: ENABLED"
        );
        console.log(
            "Admin dashboard: ENABLED"
        );
        console.log(
            "Admin transactions: ENABLED"
        );
        console.log(
            "=============================================="
        );
        console.log("");
    }
);


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on(
    "SIGINT",
    () => {
        console.log(
            "\nClosing BankGuard database..."
        );

        db.close();

        process.exit(0);
    }
);

process.on(
    "SIGTERM",
    () => {
        console.log(
            "\nClosing BankGuard database..."
        );

        db.close();

        process.exit(0);
    }
);