// ======================================================
// BANKGUARD AI FRONTEND
// ======================================================

let currentUser = null;
let isSending = false;


// ======================================================
// STARTUP
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    setupAuthButtons();
    setupAuthForms();
    setupEnterKey();

    const sendButton = $("sendButton");

    if (sendButton) {
        sendButton.addEventListener(
            "click",
            sendMessage
        );
    }

    checkLoginStatus();
});


// ======================================================
// ELEMENT HELPER
// ======================================================

function $(id) {
    return document.getElementById(id);
}


// ======================================================
// AUTH BUTTONS
// ======================================================

function setupAuthButtons() {

    const showRegisterButton =
        $("showRegisterButton");

    const showLoginButton =
        $("showLoginButton");

    const logoutButton =
        $("logoutButton");

    const adminLogoutButton =
        $("adminLogoutButton");


    if (showRegisterButton) {
        showRegisterButton.addEventListener(
            "click",
            showRegister
        );
    }


    if (showLoginButton) {
        showLoginButton.addEventListener(
            "click",
            showLogin
        );
    }


    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }


    if (adminLogoutButton) {
        adminLogoutButton.addEventListener(
            "click",
            logout
        );
    }
}


// ======================================================
// AUTH FORMS
// ======================================================

function setupAuthForms() {

    const loginForm =
        $("loginForm");

    const registerForm =
        $("registerForm");

    const addCustomerForm =
        $("addCustomerForm");

    const addTransactionForm =
        $("addTransactionForm");


    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    if (registerForm) {
        registerForm.addEventListener(
            "submit",
            handleRegistration
        );
    }


    if (addCustomerForm) {
        addCustomerForm.addEventListener(
            "submit",
            addCustomer
        );
    }


    if (addTransactionForm) {
        addTransactionForm.addEventListener(
            "submit",
            addTransaction
        );
    }
}


// ======================================================
// LOGIN STATUS
// ======================================================

async function checkLoginStatus() {

    try {

        const response =
            await fetch(
                "/api/session",
                {
                    method: "GET",
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        if (
            data.success &&
            data.loggedIn
        ) {

            showApplication(
                data.user
            );

        } else {

            showLogin();
        }

    } catch (error) {

        console.error(
            "Session check error:",
            error
        );

        showLogin();
    }
}


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    $("authScreen").classList.remove(
        "hidden"
    );

    $("mainApp").classList.add(
        "hidden"
    );

    $("adminApp").classList.add(
        "hidden"
    );

    $("loginPanel").classList.remove(
        "hidden"
    );

    $("registerPanel").classList.add(
        "hidden"
    );


    if ($("loginError")) {
        $("loginError").textContent = "";
    }


    if ($("registerError")) {
        $("registerError").textContent = "";
    }


    if ($("registerSuccess")) {
        $("registerSuccess").textContent = "";
    }
}


// ======================================================
// SHOW REGISTER
// ======================================================

function showRegister() {

    $("authScreen").classList.remove(
        "hidden"
    );

    $("mainApp").classList.add(
        "hidden"
    );

    $("adminApp").classList.add(
        "hidden"
    );

    $("loginPanel").classList.add(
        "hidden"
    );

    $("registerPanel").classList.remove(
        "hidden"
    );


    if ($("registerError")) {
        $("registerError").textContent = "";
    }


    if ($("registerSuccess")) {
        $("registerSuccess").textContent = "";
    }
}


// ======================================================
// LOGIN
// ======================================================

async function handleLogin(event) {

    event.preventDefault();


    const email =
        $("loginEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        $("loginPassword")
            .value;


    const errorBox =
        $("loginError");


    errorBox.textContent = "";


    if (!email || !password) {

        errorBox.textContent =
            "Please enter your registered email and password.";

        return;
    }


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Signing in...";
    }


    try {

        const response =
            await fetch(
                "/api/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            errorBox.textContent =
                data.message ||
                "Login failed.";

            return;
        }


        showApplication(
            data.user
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        errorBox.textContent =
            "Unable to connect to BankGuard AI.";

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Login securely";
        }
    }
}


// ======================================================
// REGISTRATION
// ======================================================

async function handleRegistration(event) {

    event.preventDefault();


    const customerId =
        $("registerCustomerId")
            .value
            .trim()
            .toUpperCase();


    const name =
        $("registerName")
            .value
            .trim();


    const mobile =
        $("registerMobile")
            .value
            .trim();


    const email =
        $("registerEmail")
            .value
            .trim()
            .toLowerCase();


    const accountNumber =
        $("registerAccountNumber")
            .value
            .trim()
            .toUpperCase();


    const password =
        $("registerPassword")
            .value;


    const errorBox =
        $("registerError");


    const successBox =
        $("registerSuccess");


    errorBox.textContent = "";
    successBox.textContent = "";


    // ==================================================
    // REQUIRED FIELDS
    // ==================================================

    if (
        !customerId ||
        !name ||
        !mobile ||
        !email ||
        !accountNumber ||
        !password
    ) {

        errorBox.textContent =
            "Please complete all fields.";

        return;
    }


    // ==================================================
    // CUSTOMER ID
    // ==================================================

    if (
        !/^BG\d{4}$/.test(
            customerId
        )
    ) {

        errorBox.textContent =
            "Enter a valid BankGuard Customer ID, for example BG1001.";

        return;
    }


    // ==================================================
    // NAME
    // ==================================================

    if (
        name.length < 2
    ) {

        errorBox.textContent =
            "Please enter your full name.";

        return;
    }


    // ==================================================
    // MOBILE
    // ==================================================

    if (
        !/^\d{10}$/.test(
            mobile
        )
    ) {

        errorBox.textContent =
            "Enter a valid 10-digit mobile number.";

        return;
    }


    // ==================================================
    // EMAIL
    // ==================================================

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {

        errorBox.textContent =
            "Please enter a valid email address.";

        return;
    }


    // ==================================================
    // ACCOUNT NUMBER
    // ==================================================

    if (
        accountNumber.length < 8
    ) {

        errorBox.textContent =
            "Please enter a valid account number.";

        return;
    }


    // ==================================================
    // PASSWORD
    // ==================================================

    if (
        password.length < 6
    ) {

        errorBox.textContent =
            "Password must contain at least 6 characters.";

        return;
    }


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Verifying customer...";
    }


    try {

        const response =
            await fetch(
                "/api/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        customerId,
                        name,
                        mobile,
                        email,
                        accountNumber,
                        password
                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            errorBox.textContent =
                data.message ||
                "Customer verification failed.";

            return;
        }


        successBox.textContent =
            "Registration successful. Please login to continue.";


        event.target.reset();


        setTimeout(() => {

            showLogin();


            if ($("loginEmail")) {

                $("loginEmail").value =
                    email;
            }

        }, 1000);


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        errorBox.textContent =
            "Unable to connect to BankGuard AI.";

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Create BankGuard Account";
        }
    }
}


// ======================================================
// SHOW APPLICATION
// ======================================================

function showApplication(user) {

    currentUser = user;


    $("authScreen").classList.add(
        "hidden"
    );


    if (
        user.role === "admin"
    ) {

        showAdminApp();

        return;
    }


    $("adminApp").classList.add(
        "hidden"
    );


    $("mainApp").classList.remove(
        "hidden"
    );


    if ($("userName")) {
        $("userName").textContent =
            user.name ||
            "Customer";
    }


    if ($("userEmail")) {
        $("userEmail").textContent =
            user.email ||
            "";
    }


    if ($("headerUserName")) {
        $("headerUserName").textContent =
            user.name ||
            "Customer";
    }


    const avatar =
        user.name
            ? user.name
                .charAt(0)
                .toUpperCase()
            : "U";


    if ($("userAvatar")) {
        $("userAvatar").textContent =
            avatar;
    }


    loadAccountSummary();

    loadMyTransactions();

    loadDisputeHistory();

    loadCustomerDisputeTransactions();
}


// ======================================================
// SHOW ADMIN APPLICATION
// ======================================================

function showAdminApp() {

    $("authScreen").classList.add(
        "hidden"
    );


    $("mainApp").classList.add(
        "hidden"
    );


    $("adminApp").classList.remove(
        "hidden"
    );


    loadAdminSummary();

    loadAdminCustomers();

    loadAdminTransactionCustomers();

    loadAdminDisputes();
}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

    try {

        await fetch(
            "/api/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    currentUser = null;


    $("mainApp").classList.add(
        "hidden"
    );


    $("adminApp").classList.add(
        "hidden"
    );


    $("authScreen").classList.remove(
        "hidden"
    );


    if ($("loginEmail")) {
        $("loginEmail").value = "";
    }


    if ($("loginPassword")) {
        $("loginPassword").value = "";
    }


    showLogin();
}


// ======================================================
// ACCOUNT SUMMARY
// ======================================================

async function loadAccountSummary() {

    try {

        const response =
            await fetch(
                "/api/account-summary",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (!data.success) {
            return;
        }


        if ($("totalTransactions")) {

            $("totalTransactions").textContent =
                data.summary.totalTransactions ??
                0;
        }


        if ($("failedTransactions")) {

            $("failedTransactions").textContent =
                data.summary.failedTransactions ??
                0;
        }


        if ($("pendingRefunds")) {

            $("pendingRefunds").textContent =
                data.summary.pendingRefunds ??
                0;
        }


        if ($("openDisputes")) {

            $("openDisputes").textContent =
                data.summary.openDisputes ??
                0;
        }


    } catch (error) {

        console.error(
            "Summary error:",
            error
        );
    }
}


// ======================================================
// LOAD CUSTOMER TRANSACTIONS
// ======================================================

async function loadMyTransactions() {

    const container =
        $("transactionList");


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="loading-card">
            Loading your transactions...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/my-transactions",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (!data.success) {

            container.innerHTML = `
                <div class="empty-card">
                    Unable to load transactions.
                </div>
            `;

            return;
        }


        if (
            !data.transactions ||
            !data.transactions.length
        ) {

            container.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        💳
                    </div>

                    <h3>
                        No transactions yet
                    </h3>

                    <p>
                        Your transaction history
                        will appear here.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            data.transactions
                .map(renderTransaction)
                .join("");


    } catch (error) {

        console.error(
            "Transaction loading error:",
            error
        );


        container.innerHTML = `
            <div class="empty-card">
                Unable to connect to the server.
            </div>
        `;
    }
}


// ======================================================
// TRANSACTION CARD
// ======================================================

function renderTransaction(transaction) {

    const statusClass =
        getStatusClass(
            transaction.status
        );


    const icon =
        getTransactionIcon(
            transaction.type
        );


    const issue =
        transaction.status !== "SUCCESS" &&
        transaction.status !== "REVERSED";


    const transactionId =
        escapeHtml(
            transaction.transaction_id
        );


    return `
        <div class="transaction-card">

            <div class="transaction-top">

                <div class="transaction-type">

                    <div class="transaction-icon">
                        ${icon}
                    </div>

                    <div>

                        <strong>
                            ${transactionId}
                        </strong>

                        <span>
                            ${escapeHtml(
                                transaction.type
                            )}
                        </span>

                    </div>

                </div>


                <span
                    class="status-pill ${statusClass}"
                >
                    ${escapeHtml(
                        transaction.status
                    )}
                </span>

            </div>


            <div class="transaction-amount">
                ₹${Number(
                    transaction.amount || 0
                ).toLocaleString("en-IN")}
            </div>


            <div class="transaction-merchant">

                <span>
                    Merchant
                </span>

                <strong>
                    ${escapeHtml(
                        transaction.merchant
                    )}
                </strong>

            </div>


            <div class="transaction-details">

                <div>

                    <span>
                        Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.transaction_date ||
                            transaction.date ||
                            ""
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Debit
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.debit_status ||
                            ""
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Refund
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.refund_status ||
                            ""
                        )}
                    </strong>

                </div>

            </div>


            ${
                issue
                    ? `
                        <button
                            type="button"
                            class="transaction-action"
                            onclick="askAboutTransaction('${escapeJs(
                                transaction.transaction_id
                            )}')"
                        >
                            Ask BankGuard about this →
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}


// ======================================================
// TRANSACTION ICON
// ======================================================

function getTransactionIcon(type) {

    if (
        type === "UPI"
    ) {
        return "↗";
    }


    if (
        type === "ATM"
    ) {
        return "🏧";
    }


    if (
        type === "CARD"
    ) {
        return "💳";
    }


    return "💰";
}


// ======================================================
// STATUS CLASS
// ======================================================

function getStatusClass(status) {

    if (
        status === "SUCCESS" ||
        status === "REVERSED"
    ) {

        return "success";
    }


    if (
        status === "FAILED" ||
        status === "CASH_NOT_RECEIVED"
    ) {

        return "danger";
    }


    if (
        status === "PENDING" ||
        status === "DUPLICATE"
    ) {

        return "warning";
    }


    return "neutral";
}


// ======================================================
// ASK ABOUT TRANSACTION
// ======================================================

function askAboutTransaction(
    transactionId
) {

    const input =
        $("messageInput");


    if (!input) {
        return;
    }


    input.value =
        `Please check transaction ${transactionId}.`;


    scrollToSection(
        "chatSection"
    );


    sendMessage();
}


// ======================================================
// QUICK MESSAGE
// ======================================================

function sendQuickMessage(message) {

    const input =
        $("messageInput");


    if (!input) {
        return;
    }


    input.value =
        message;


    sendMessage();
}


// ======================================================
// CHAT
// ======================================================

async function sendMessage() {

    if (isSending) {
        return;
    }


    const input =
        $("messageInput");


    const sendButton =
        $("sendButton");


    if (
        !input ||
        !sendButton
    ) {

        return;
    }


    const message =
        input.value.trim();


    if (!message) {
        return;
    }


    isSending = true;

    sendButton.disabled = true;


    addUserMessage(
        message
    );


    input.value = "";

    input.style.height =
        "auto";


    showTyping();


    try {

        // Extract transaction ID
        // such as TXN1001

        const transactionMatch =
            message.match(
                /TXN\d+/i
            );


        const transactionId =
            transactionMatch
                ? transactionMatch[0]
                    .toUpperCase()
                : null;


        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        message,
                        transactionId
                    })
                }
            );


        if (
            response.status === 401
        ) {

            hideTyping();

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        hideTyping();


        if (!data.success) {

            addBotMessage(
                data.message ||
                "Something went wrong."
            );

            return;
        }


        addBotMessage(
            data.message,
            data.verified,
            data.transaction
        );


    } catch (error) {

        console.error(
            "Chat error:",
            error
        );


        hideTyping();


        addBotMessage(
            "I couldn't connect to the BankGuard server. Please try again."
        );


    } finally {

        isSending = false;

        sendButton.disabled = false;

        input.focus();
    }
}


// ======================================================
// ADD USER MESSAGE
// ======================================================

function addUserMessage(message) {

    const container =
        $("chatMessages");


    if (!container) {
        return;
    }


    const avatar =
        currentUser &&
        currentUser.name
            ? currentUser.name
                .charAt(0)
                .toUpperCase()
            : "U";


    const html = `
        <div class="message-row user-row">

            <div class="message user-message">

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>


            <div class="chat-avatar user-chat-avatar">
                ${escapeHtml(avatar)}
            </div>

        </div>
    `;


    container.insertAdjacentHTML(
        "beforeend",
        html
    );


    scrollChatToBottom();
}


// ======================================================
// ADD BOT MESSAGE
// ======================================================

function addBotMessage(
    message,
    verified = false,
    transaction = null
) {

    const container =
        $("chatMessages");


    if (!container) {
        return;
    }


    let verifiedBlock = "";


    if (
        verified &&
        transaction
    ) {

        verifiedBlock = `
            <div class="verified-transaction">

                <div class="verified-title">
                    ✓ Verified against your account
                </div>


                <div class="verified-grid">

                    <div>

                        <span>
                            Transaction
                        </span>

                        <strong>
                            ${escapeHtml(
                                transaction.transaction_id
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Amount
                        </span>

                        <strong>
                            ₹${Number(
                                transaction.amount || 0
                            ).toLocaleString("en-IN")}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Status
                        </span>

                        <strong>
                            ${escapeHtml(
                                transaction.status
                            )}
                        </strong>

                    </div>

                </div>


                <button
                    type="button"
                    class="dispute-button"
                    onclick="generateDispute(
                        '${escapeJs(
                            transaction.transaction_id
                        )}',
                        '${escapeJs(
                            transaction.status
                        )}'
                    )"
                >
                    Create formal dispute
                </button>

            </div>
        `;
    }


    const html = `
        <div class="message-row bot-row">

            <div class="chat-avatar bot-avatar">
                B
            </div>


            <div class="message bot-message">

                <div class="message-name">
                    BankGuard AI
                </div>


                <div class="bot-text">
                    ${formatText(
                        message || ""
                    )}
                </div>


                ${verifiedBlock}

            </div>

        </div>
    `;


    container.insertAdjacentHTML(
        "beforeend",
        html
    );


    scrollChatToBottom();
}


// ======================================================
// FORMAT BOT TEXT
// ======================================================

function formatText(text) {

    let safe =
        escapeHtml(
            text || ""
        );


    safe = safe.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    safe = safe.replace(
        /\n/g,
        "<br>"
    );


    return safe;
}


// ======================================================
// TYPING
// ======================================================

function showTyping() {

    const typing =
        $("typing");


    if (!typing) {
        return;
    }


    typing.classList.remove(
        "hidden"
    );


    scrollChatToBottom();
}


function hideTyping() {

    const typing =
        $("typing");


    if (!typing) {
        return;
    }


    typing.classList.add(
        "hidden"
    );
}


// ======================================================
// AI-GENERATED / QUICK DISPUTE
// ======================================================

async function generateDispute(
    transactionId,
    status
) {

    const complaint =
        `I would like to raise a dispute regarding transaction ${transactionId}. The transaction is recorded with status ${status}.`;


    try {

        const response =
            await fetch(
                "/api/dispute",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        transactionId,

                        issue: status,

                        description: complaint,

                        complaint

                    })
                }
            );


        if (
            response.status === 401
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (data.success) {

            addBotMessage(
                `Your formal dispute has been created successfully. Dispute ID: ${data.disputeId}. It is currently marked as OPEN.`
            );


            await loadAccountSummary();

            await loadDisputeHistory();


            scrollToSection(
                "disputesSection"
            );


        } else {

            addBotMessage(
                data.message ||
                "Unable to create the dispute."
            );
        }


    } catch (error) {

        console.error(
            "Dispute error:",
            error
        );


        addBotMessage(
            "Unable to create the dispute right now."
        );
    }
}


// ======================================================
// LOAD TRANSACTIONS INTO CUSTOMER DISPUTE DROPDOWN
// ======================================================

async function loadCustomerDisputeTransactions() {

    const select =
        $("customerDisputeTransaction");


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Loading transactions...
        </option>
    `;


    try {

        const response =
            await fetch(
                "/api/my-transactions",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.transactions ||
            !data.transactions.length
        ) {

            select.innerHTML = `
                <option value="">
                    No transactions available
                </option>
            `;

            return;
        }


        select.innerHTML = `
            <option value="">
                Select a transaction
            </option>
        `;


        data.transactions.forEach(
            transaction => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    transaction.transaction_id;


                option.textContent =
                    `${transaction.transaction_id} — ₹${Number(
                        transaction.amount || 0
                    ).toLocaleString("en-IN")} — ${transaction.status}`;


                select.appendChild(
                    option
                );
            }
        );


    } catch (error) {

        console.error(
            "Customer dispute transaction loading error:",
            error
        );


        select.innerHTML = `
            <option value="">
                Unable to load transactions
            </option>
        `;
    }
}


// ======================================================
// CUSTOMER SUBMIT DISPUTE
// ======================================================

async function submitCustomerDispute(event) {

    event.preventDefault();


    const transactionId =
        $("customerDisputeTransaction")
            ?.value
            .trim();


    const issue =
        $("customerDisputeIssue")
            ?.value
            .trim();


    const description =
        $("customerDisputeDescription")
            ?.value
            .trim();


    const messageBox =
        $("customerDisputeMessage");


    if (messageBox) {
        messageBox.textContent = "";
        messageBox.className =
            "form-message";
    }


    // ==================================================
    // VALIDATION
    // ==================================================

    if (!transactionId) {

        showDisputeFormMessage(
            "Please select a transaction first.",
            "error"
        );

        return;
    }


    if (!issue) {

        showDisputeFormMessage(
            "Please select an issue type.",
            "error"
        );

        return;
    }


    if (!description) {

        showDisputeFormMessage(
            "Please describe the problem.",
            "error"
        );

        return;
    }


    if (
        description.length < 10
    ) {

        showDisputeFormMessage(
            "Please provide a little more detail about the problem.",
            "error"
        );

        return;
    }


    const form =
        event.target;


    const button =
        form.querySelector(
            "button[type='submit']"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Submitting dispute...";
    }


    try {

        const response =
            await fetch(
                "/api/dispute",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        transactionId,

                        issue,

                        description,

                        complaint:
                            description

                    })
                }
            );


        if (
            response.status === 401
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            showDisputeFormMessage(
                data.message ||
                "Unable to create the dispute.",
                "error"
            );

            return;
        }


        showDisputeFormMessage(
            `Dispute created successfully. Dispute ID: ${data.disputeId}. Status: OPEN.`,
            "success"
        );


        form.reset();


        await loadAccountSummary();

        await loadDisputeHistory();

        await loadCustomerDisputeTransactions();


    } catch (error) {

        console.error(
            "Customer dispute error:",
            error
        );


        showDisputeFormMessage(
            "Unable to connect to the BankGuard server.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Submit Dispute";
        }
    }
}


// ======================================================
// DISPUTE FORM MESSAGE
// ======================================================

function showDisputeFormMessage(
    message,
    type
) {

    const box =
        $("customerDisputeMessage");


    if (!box) {
        return;
    }


    box.textContent =
        message;


    box.className =
        `form-message ${type}-message`;
}


// ======================================================
// DISPUTE HISTORY
// ======================================================

async function loadDisputeHistory() {

    const container =
        $("disputeHistory");


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/disputes",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401
        ) {
            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.disputes ||
            !data.disputes.length
        ) {

            container.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        📋
                    </div>

                    <h3>
                        No disputes yet
                    </h3>

                    <p>
                        Your formal transaction disputes
                        will appear here.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            data.disputes
                .map(
                    dispute =>
                        renderCustomerDispute(
                            dispute
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Dispute history error:",
            error
        );


        container.innerHTML = `
            <div class="empty-card">
                Unable to load dispute history.
            </div>
        `;
    }
}


// ======================================================
// CUSTOMER DISPUTE CARD
// ======================================================

function renderCustomerDispute(dispute) {

    const status =
        String(
            dispute.status ||
            "OPEN"
        ).toUpperCase();


    let statusClass =
        "neutral";


    if (
        status === "OPEN"
    ) {

        statusClass =
            "warning";

    } else if (
        status === "IN_PROGRESS"
    ) {

        statusClass =
            "warning";

    } else if (
        status === "ACCEPTED" ||
        status === "RESOLVED"
    ) {

        statusClass =
            "success";

    } else if (
        status === "REJECTED"
    ) {

        statusClass =
            "danger";
    }


    const statusText =
        status === "ACCEPTED"
            ? "ACCEPTED"
            : status;


    return `
        <div class="dispute-card">

            <div class="dispute-header">

                <div>

                    <strong>
                        Dispute #${escapeHtml(
                            dispute.dispute_id
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            dispute.transaction_id
                        )}
                    </span>

                </div>


                <span
                    class="dispute-status ${statusClass}"
                >
                    ${escapeHtml(statusText)}
                </span>

            </div>


            <div class="dispute-body">

                <div class="dispute-detail-row">

                    <span>
                        Issue
                    </span>

                    <strong>
                        ${escapeHtml(
                            dispute.issue ||
                            ""
                        )}
                    </strong>

                </div>


                ${
                    dispute.merchant
                        ? `
                            <div class="dispute-detail-row">

                                <span>
                                    Merchant
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        dispute.merchant
                                    )}
                                </strong>

                            </div>
                        `
                        : ""
                }


                ${
                    dispute.amount !== undefined &&
                    dispute.amount !== null
                        ? `
                            <div class="dispute-detail-row">

                                <span>
                                    Amount
                                </span>

                                <strong>
                                    ₹${Number(
                                        dispute.amount || 0
                                    ).toLocaleString("en-IN")}
                                </strong>

                            </div>
                        `
                        : ""
                }


                <p>
                    ${escapeHtml(
                        dispute.description ||
                        dispute.complaint ||
                        ""
                    )}
                </p>


                ${
                    dispute.status === "ACCEPTED"
                        ? `
                            <div class="dispute-decision accepted">
                                ✓ Your dispute has been accepted by BankGuard.
                            </div>
                        `
                        : ""
                }


                ${
                    dispute.status === "REJECTED"
                        ? `
                            <div class="dispute-decision rejected">
                                ✕ Your dispute has been rejected by BankGuard.
                            </div>
                        `
                        : ""
                }


                ${
                    dispute.status === "OPEN"
                        ? `
                            <div class="dispute-decision pending">
                                ⏳ Your dispute is awaiting administrator review.
                            </div>
                        `
                        : ""
                }


                <small>
                    ${formatDate(
                        dispute.created_at
                    )}
                </small>

            </div>

        </div>
    `;
}


async function loadAdminSummary() {

    try {

        const response =
            await fetch(
                "/api/admin/summary",
                {
                    credentials: "include"
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            handleSessionExpired();
            return;
        }

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        const stats =
            data.stats || {};

        if ($("adminTotalCustomers")) {
            $("adminTotalCustomers").textContent =
                stats.customers ?? 0;
        }

        if ($("adminRegisteredCustomers")) {
            $("adminRegisteredCustomers").textContent =
                stats.registeredCustomers ?? 0;
        }

        if ($("adminOpenDisputes")) {
            $("adminOpenDisputes").textContent =
                stats.openDisputes ?? 0;
        }

    } catch (error) {

        console.error(
            "Admin summary error:",
            error
        );
    }
}

// ======================================================
// LOAD ADMIN CUSTOMERS
// ======================================================

async function loadAdminCustomers() {

    const container =
        $("adminCustomerList");


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="loading-card">
            Loading customers...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/admin/customers",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.customers ||
            !data.customers.length
        ) {

            container.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        👥
                    </div>

                    <h3>
                        No customers found
                    </h3>

                    <p>
                        Add a customer to begin.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            data.customers
                .map(renderAdminCustomer)
                .join("");


    } catch (error) {

        console.error(
            "Admin customer loading error:",
            error
        );


        container.innerHTML = `
            <div class="empty-card">
                Unable to load customers.
            </div>
        `;
    }
}


// ======================================================
// LOAD CUSTOMERS FOR TRANSACTION FORM
// ======================================================

async function loadAdminTransactionCustomers() {

    const select =
        $("adminTransactionCustomer");


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Loading customers...
        </option>
    `;


    try {

        const response =
            await fetch(
                "/api/admin/customers",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.customers ||
            !data.customers.length
        ) {

            select.innerHTML = `
                <option value="">
                    No customers available
                </option>
            `;

            return;
        }


        select.innerHTML = `
            <option value="">
                Select customer
            </option>
        `;


        data.customers.forEach(
            customer => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    customer.customer_id;


                option.textContent =
                    `${customer.customer_id} — ${customer.name}`;


                select.appendChild(
                    option
                );
            }
        );


    } catch (error) {

        console.error(
            "Transaction customer loading error:",
            error
        );


        select.innerHTML = `
            <option value="">
                Unable to load customers
            </option>
        `;
    }
}


// ======================================================
// ADMIN CUSTOMER CARD
// ======================================================

function renderAdminCustomer(customer) {

    const initial =
        customer.name
            ? customer.name
                .charAt(0)
                .toUpperCase()
            : "C";


    const registered =
        customer.registered === true;


    return `
        <div class="admin-customer-card">

            <div class="admin-customer-main">

                <div class="admin-customer-avatar">
                    ${escapeHtml(initial)}
                </div>


                <div class="admin-customer-info">

                    <h3>
                        ${escapeHtml(
                            customer.name
                        )}
                    </h3>


                    <p>
                        Customer ID:

                        <strong>
                            ${escapeHtml(
                                customer.customer_id
                            )}
                        </strong>
                    </p>


                    <div class="admin-customer-meta">

                        <span>
                            📱
                            ${escapeHtml(
                                customer.mobile
                            )}
                        </span>


                        <span>
                            ✉️
                            ${escapeHtml(
                                customer.email
                            )}
                        </span>


                        <span>
                            🏦
                            ${escapeHtml(
                                customer.branch
                            )}
                        </span>


                        <span>
                            📍
                            ${escapeHtml(
                                customer.city
                            )}
                        </span>

                    </div>

                </div>

            </div>


            <div class="admin-customer-actions">

                <span
                    class="registration-pill ${
                        registered
                            ? "registered"
                            : "not-registered"
                    }"
                >

                    ${
                        registered
                            ? "Registered"
                            : "Not registered"
                    }

                </span>


                <button
                    type="button"
                    class="delete-customer-button"
                    onclick="deleteCustomer(
                        '${escapeJs(
                            customer.customer_id
                        )}',
                        '${escapeJs(
                            customer.name
                        )}'
                    )"
                >
                    Delete
                </button>

            </div>

        </div>
    `;
}


// ======================================================
// ADD CUSTOMER
// ======================================================

async function addCustomer(event) {

    event.preventDefault();


    const name =
        $("adminCustomerName")
            .value
            .trim();


    const mobile =
        $("adminCustomerMobile")
            .value
            .trim();


    const email =
        $("adminCustomerEmail")
            .value
            .trim()
            .toLowerCase();


    const branch =
        $("adminCustomerBranch")
            .value
            .trim();


    const city =
        $("adminCustomerCity")
            .value
            .trim();


    const messageBox =
        $("adminCustomerMessage");


    messageBox.textContent = "";


    if (
        !name ||
        !mobile ||
        !email ||
        !branch ||
        !city
    ) {

        messageBox.textContent =
            "Please complete all customer fields.";

        return;
    }


    if (
        !/^\d{10}$/.test(
            mobile
        )
    ) {

        messageBox.textContent =
            "Enter a valid 10-digit mobile number.";

        return;
    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {

        messageBox.textContent =
            "Enter a valid email address.";

        return;
    }


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Adding customer...";
    }


    try {

        const response =
            await fetch(
                "/api/admin/customers",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name,
                        mobile,
                        email,
                        branch,
                        city
                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            messageBox.textContent =
                data.message ||
                "Unable to add customer.";

            return;
        }


        messageBox.textContent =
            `Customer added successfully. Customer ID: ${data.customer.customerId}`;


        event.target.reset();


        await loadAdminSummary();

        await loadAdminCustomers();

        await loadAdminTransactionCustomers();


    } catch (error) {

        console.error(
            "Add customer error:",
            error
        );


        messageBox.textContent =
            "Unable to connect to BankGuard server.";


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Add Customer";
        }
    }
}


// ======================================================
// ADD TRANSACTION
// ======================================================

async function addTransaction(event) {

    event.preventDefault();


    const customerId =
        $("adminTransactionCustomer")
            .value
            .trim();


    const type =
        $("adminTransactionType")
            .value
            .trim();


    const amount =
        $("adminTransactionAmount")
            .value
            .trim();


    const merchant =
        $("adminTransactionMerchant")
            .value
            .trim();


    const status =
        $("adminTransactionStatus")
            .value
            .trim();


    const debitStatus =
        $("adminTransactionDebitStatus")
            .value
            .trim();


    const refundStatus =
        $("adminTransactionRefundStatus")
            .value
            .trim();


    const transactionDate =
        $("adminTransactionDate")
            .value
            .trim();


    const messageBox =
        $("adminTransactionMessage");


    messageBox.textContent = "";


    if (
        !customerId ||
        !type ||
        !amount ||
        !merchant ||
        !status ||
        !debitStatus ||
        !refundStatus ||
        !transactionDate
    ) {

        messageBox.textContent =
            "Please complete all transaction fields.";

        return;
    }


    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount <= 0
    ) {

        messageBox.textContent =
            "Enter a valid transaction amount.";

        return;
    }


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Adding transaction...";
    }


    try {

        const response =
            await fetch(
                "/api/admin/transactions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        customerId,

                        type,

                        amount:
                            numericAmount,

                        merchant,

                        status,

                        debitStatus,

                        refundStatus,

                        transactionDate
                    })
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            messageBox.textContent =
                data.message ||
                "Unable to add transaction.";

            return;
        }


        messageBox.textContent =
            `Transaction added successfully. Transaction ID: ${data.transaction.transactionId}`;


        event.target.reset();


        await loadAdminTransactionCustomers();

        await loadAdminSummary();


    } catch (error) {

        console.error(
            "Add transaction error:",
            error
        );


        messageBox.textContent =
            "Unable to connect to BankGuard server.";


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Add Transaction";
        }
    }
}


// ======================================================
// DELETE CUSTOMER
// ======================================================

async function deleteCustomer(
    customerId,
    name
) {

    const confirmed =
        confirm(
            `Are you sure you want to delete ${name} (${customerId})?\n\nThis will remove the customer's BankGuard record, online banking access and disputes.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/customers/${encodeURIComponent(
                    customerId
                )}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                "Unable to delete customer."
            );

            return;
        }


        alert(
            "Customer deleted successfully."
        );


        await loadAdminSummary();

        await loadAdminCustomers();

        await loadAdminTransactionCustomers();

        await loadAdminDisputes();


    } catch (error) {

        console.error(
            "Delete customer error:",
            error
        );


        alert(
            "Unable to connect to BankGuard server."
        );
    }
}


// ======================================================
// ADMIN DISPUTES
// ======================================================

async function loadAdminDisputes() {

    const container =
        $("adminDisputeList");


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="loading-card">
            Loading disputes...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/admin/disputes",
                {
                    credentials: "include"
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.disputes ||
            !data.disputes.length
        ) {

            container.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        📋
                    </div>

                    <h3>
                        No disputes
                    </h3>

                    <p>
                        Customer disputes will appear here.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            data.disputes
                .map(renderAdminDispute)
                .join("");


    } catch (error) {

        console.error(
            "Admin dispute loading error:",
            error
        );


        container.innerHTML = `
            <div class="empty-card">
                Unable to load disputes.
            </div>
        `;
    }
}


// ======================================================
// ADMIN DISPUTE CARD
// ======================================================

function renderAdminDispute(dispute) {

    const status =
        String(
            dispute.status ||
            "OPEN"
        ).toUpperCase();


    let statusClass =
        "neutral";


    if (
        status === "OPEN"
    ) {

        statusClass =
            "warning";

    } else if (
        status === "ACCEPTED" ||
        status === "RESOLVED"
    ) {

        statusClass =
            "success";

    } else if (
        status === "REJECTED"
    ) {

        statusClass =
            "danger";
    }


    const actionButtons =
        status === "OPEN"
            ? `
                <div class="admin-dispute-actions">

                    <button
                        type="button"
                        class="primary-button"
                        onclick="updateDisputeStatus(
                            ${Number(
                                dispute.dispute_id
                            )},
                            'ACCEPTED'
                        )"
                    >
                        ✓ Accept Dispute
                    </button>


                    <button
                        type="button"
                        class="danger-button"
                        onclick="updateDisputeStatus(
                            ${Number(
                                dispute.dispute_id
                            )},
                            'REJECTED'
                        )"
                    >
                        ✕ Reject Dispute
                    </button>

                </div>
            `
            : `
                <div class="admin-dispute-decision">

                    ${
                        status === "ACCEPTED"
                            ? "✓ This dispute has been accepted."
                            : "✕ This dispute has been rejected."
                    }

                </div>
            `;


    return `
        <div class="admin-dispute-card">

            <div class="admin-dispute-header">

                <div>

                    <strong>
                        Dispute #${escapeHtml(
                            dispute.dispute_id
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            dispute.transaction_id
                        )}
                    </span>

                </div>


                <span
                    class="dispute-status ${statusClass}"
                >
                    ${escapeHtml(status)}
                </span>

            </div>


            <div class="admin-dispute-body">

                <div class="admin-dispute-grid">

                    <div>

                        <span>
                            Customer
                        </span>

                        <strong>
                            ${escapeHtml(
                                dispute.customer_name ||
                                dispute.customer_id ||
                                ""
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Customer ID
                        </span>

                        <strong>
                            ${escapeHtml(
                                dispute.customer_id ||
                                ""
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Transaction
                        </span>

                        <strong>
                            ${escapeHtml(
                                dispute.transaction_id ||
                                ""
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Amount
                        </span>

                        <strong>
                            ₹${Number(
                                dispute.amount || 0
                            ).toLocaleString("en-IN")}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Merchant
                        </span>

                        <strong>
                            ${escapeHtml(
                                dispute.merchant ||
                                ""
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Issue
                        </span>

                        <strong>
                            ${escapeHtml(
                                dispute.issue ||
                                ""
                            )}
                        </strong>

                    </div>

                </div>


                <div class="admin-dispute-description">

                    <span>
                        Customer description
                    </span>

                    <p>
                        ${escapeHtml(
                            dispute.description ||
                            dispute.complaint ||
                            ""
                        )}
                    </p>

                </div>


                <small>
                    Created:
                    ${formatDate(
                        dispute.created_at
                    )}
                </small>


                ${actionButtons}

            </div>

        </div>
    `;
}


// ======================================================
// ADMIN ACCEPT / REJECT DISPUTE
// ======================================================

async function updateDisputeStatus(
    disputeId,
    status
) {

    const action =
        status === "ACCEPTED"
            ? "accept"
            : "reject";


    const confirmed =
        confirm(
            `Are you sure you want to ${action} dispute #${disputeId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/disputes/${encodeURIComponent(
                    disputeId
                )}`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        status
                    })
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleSessionExpired();

            return;
        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.message ||
                `Unable to ${action} dispute.`
            );

            return;
        }


        alert(
            status === "ACCEPTED"
                ? "Dispute accepted successfully."
                : "Dispute rejected successfully."
        );


        await loadAdminDisputes();

        await loadAdminSummary();


    } catch (error) {

        console.error(
            "Update dispute status error:",
            error
        );


        alert(
            "Unable to connect to BankGuard server."
        );
    }
}


// ======================================================
// ENTER KEY + TEXTAREA AUTO HEIGHT
// ======================================================

function setupEnterKey() {

    const input =
        $("messageInput");


    if (!input) {
        return;
    }


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );


    input.addEventListener(
        "input",
        function () {

            this.style.height =
                "auto";


            this.style.height =
                Math.min(
                    this.scrollHeight,
                    130
                ) + "px";
        }
    );
}


// ======================================================
// SCROLL CHAT
// ======================================================

function scrollChatToBottom() {

    const container =
        $("chatMessages");


    if (!container) {
        return;
    }


    setTimeout(() => {

        container.scrollTop =
            container.scrollHeight;

    }, 50);
}


// ======================================================
// SCROLL TO SECTION
// ======================================================

function scrollToSection(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ======================================================
// SESSION EXPIRED
// ======================================================

function handleSessionExpired() {

    currentUser = null;


    alert(
        "Your session has expired. Please login again."
    );


    showLogin();
}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(dateString);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ======================================================
// HTML ESCAPING
// ======================================================

function escapeHtml(value) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ======================================================
// JAVASCRIPT STRING ESCAPING
// ======================================================

function escapeJs(value) {

    return String(value ?? "")

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        )

        .replace(
            /\r/g,
            "\\r"
        )

        .replace(
            /\n/g,
            "\\n"
        );
}