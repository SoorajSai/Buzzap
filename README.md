<div align="center">
  <img src="./frontend/public/logo.png" alt="Buzzap Logo" width="200" />
  <h1>🚀 Buzzap</h1>
  <p><strong>The Ultimate Open-Source WhatsApp Bulk Messaging Platform</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="NodeJS" />
    <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=Puppeteer&logoColor=white" alt="Puppeteer" />
  </p>
</div>

<hr />

## 🌟 Overview

**Buzzap** is a modern, high-performance web application designed for sending bulk WhatsApp messages seamlessly. Built with scalability and security in mind, Buzzap allows you to broadcast messages and media to thousands of contacts while protecting your session data.

Whether you're managing marketing campaigns, sending out event invites, or keeping your community updated, Buzzap gives you complete control with a beautiful user interface.

## ✨ Features

- **📱 Seamless Web Login:** Scan a QR code directly from the dashboard to securely link your WhatsApp account.
- **👥 Multi-Tenant Architecture:** Multiple users can log in simultaneously from different devices using isolated sessions. No crossed wires!
- **🛡️ Ephemeral Security:** We don't save your session to the server's disk. Close your tab, and your session is instantly and permanently destroyed to prevent hijacking.
- **📊 Live Progress Tracking:** Watch your broadcast status in real-time through WebSockets. See exactly who received your message and who didn't.
- **⏱️ Smart Delays:** Configure minimum and maximum delays between messages to mimic human behavior and avoid spam flags.
- **⏯️ Broadcast Controls:** Pause, resume, or abort your messaging queue at any time.
- **🖼️ Media Support:** Attach and send images effortlessly along with your text.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- CSS (Modern UI/UX)
- Socket.io Client

**Backend:**
- Node.js & Express
- `whatsapp-web.js` (Puppeteer wrapper for WhatsApp Web)
- Socket.io (Real-time events)
- SQLite (Legal agreements & data)

---

## 🚀 Quick Start

Follow these steps to get Buzzap running on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Buzzap.git
cd Buzzap
```

### 2. Setup the Backend
Open a terminal and navigate to the backend directory:
```bash
cd backend
npm install
node server.js
```
*The backend server will start running on port `3005`.*

### 3. Setup the Frontend
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
*The React app will launch, usually on `http://localhost:5173`.*

---

## 💡 How to Use

1. Open the frontend URL in your browser.
2. Accept the terms and conditions if prompted.
3. Open WhatsApp on your phone and scan the QR code displayed on the screen.
4. Enter your list of phone numbers (supports country codes).
5. Type your message and attach an image (optional).
6. Set your delay timers (default 4-7 seconds recommended).
7. Hit **Send** and watch the live progress!

---

## ⚠️ Important Disclaimer

**Use Responsibly!** 
This tool is meant for legitimate broadcasting to users who have opted in. Sending unsolicited spam messages violates WhatsApp's Terms of Service and will almost certainly result in your number getting permanently banned. 

The developers of Buzzap are **not responsible** for any account bans, suspensions, or misuse of this software.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/Buzzap/issues).

## 📄 License

This project is open-sourced under the MIT License - see the LICENSE file for details.

---
<div align="center">
  <i>Made with ❤️ by Sooraj Sai</i>
</div>
