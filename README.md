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

Everything runs entirely on your own machine — your WhatsApp session never
leaves it. Follow these steps to get Buzzap running locally.

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer (and npm, which comes with it)
- An internet connection for the first install (see note below) and for
  WhatsApp Web itself

> **Note:** You do **not** need to install Google Chrome yourself. The first
> time you run `npm install` in the `backend` folder, it will download a
> bundled Chromium browser (~200MB) that Buzzap drives automatically. This
> can take a minute or two depending on your connection.

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/Buzzap.git
cd Buzzap
```

### 2. Set Up the Backend
In one terminal:
```bash
cd backend
npm install
node server.js
```
You should see `Server running on port 3005`. Leave this terminal running.

### 3. Set Up the Frontend
In a **second** terminal:
```bash
cd frontend
npm install
npm run dev
```
The React app will launch on `http://localhost:5173` and will automatically
talk to the backend you just started on port `3005` — no extra configuration
needed.

> Want the frontend to talk to a backend running elsewhere instead? Copy
> `frontend/.env.example` to `frontend/.env` and set `VITE_BACKEND_URL`.

---

## 💡 How to Use

1. Open `http://localhost:5173` in your browser.
2. Accept the legal disclaimer checkbox when prompted.
3. Open WhatsApp on your phone → **Linked Devices** → **Link a Device**, and
   scan the QR code shown on screen.
4. Add recipients by uploading a CSV file (e.g. exported from a Google Form)
   or typing numbers in manually — country code is handled automatically for
   10-digit Indian numbers.
5. Type your message — this can include a WhatsApp group invite link if
   you're inviting people to join a group — and optionally attach up to 2
   images.
6. Set your delay timers (4–7 seconds is the built-in safe default).
7. Hit **Send** and watch the live progress. You can pause, resume, or stop
   the broadcast at any time.

---

## ⚠️ Important Disclaimer

**Use Responsibly!** 
This tool is meant for legitimate broadcasting to users who have opted in. Sending unsolicited spam messages violates WhatsApp's Terms of Service and will almost certainly result in your number getting permanently banned. 

The developers of Buzzap are **not responsible** for any account bans, suspensions, or misuse of this software.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/<your-username>/Buzzap/issues).

## 📄 License

This project is licensed under the MIT License with additional attribution
and ethical-use terms — see the [LICENSE](./LICENSE) file for the full text.

---
<div align="center">
  <i>Made with ❤️ by Sooraj Sai</i>
</div>
