# 🤖 MEHTAB-MD

This is a WhatsApp bot built using the Baileys library for group management, including features like tagging all members, muting/unmuting, media downloaders, AI features, and many more. It's designed to help admins efficiently manage WhatsApp groups.

<div align="center"> 
  <a href="https://git.io/typing-svg"> 
    <img src="https://readme-typing-svg.demolab.com?font=Ribeye&size=50&pause=1000&color=33ff00&center=true&width=910&height=100&lines=MEHTAB-MD;Multi+Device+Whatsapp+Bot;Coded+By+MALIK+MEHTAB" alt="Typing SVG" />
  </a> 
</div> 

<div align="center"> 
  <a href="https://github.com/themalik-g/MEHTAB-MD">
    <img src="https://github.com/themalik-g/MEHTAB-MD/blob/main/assets/bot_image.jpg" alt="MEHTAB-MD" height="300">
  </a> 
</div>

<div align="center">
  <img src="https://img.shields.io/github/followers/themalik-g?style=for-the-badge&label=Followers" alt="Followers"/>
  <img src="https://img.shields.io/github/stars/themalik-g/MEHTAB-MD?style=for-the-badge&label=Stars" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/themalik-g/MEHTAB-MD?style=for-the-badge&label=Forks" alt="Forks"/>
  <img src="https://img.shields.io/github/watchers/themalik-g/MEHTAB-MD?style=for-the-badge&label=Watchers" alt="Watchers"/>
</div>


---

## 🚀 Steps to Deploy Bot

### Step 1: Fork the Repository

Click the button below to fork the MEHTAB-MD repository to your GitHub account:

<div align="center">
  <a href="https://github.com/themalik-g/MEHTAB-MD/fork">
    <img src="https://img.shields.io/badge/Fork-Repository-blue?style=for-the-badge" alt="Fork the repository"/>
  </a>
</div>

---

### Step 2: Get Pair Code

Deploy the bot and easily connect it to your WhatsApp account by pair code. Click the button below to get your pair code.

<div align="center">
  <a href="https://knight-bot-paircode.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/GET%20PAIR%20CODE-Easy%20Method-ff4d4d?style=for-the-badge" alt="Generate Pair Code"/>
  </a>
</div>

### After getting creds.json file, upload it to session folder

---

### Join Us

<div align="center">
  <a href="https://t.me/M347ab">
    <img src="https://img.shields.io/badge/Join%20Telegram-0078E7?style=for-the-badge&logo=telegram&logoColor=white" alt="Join Telegram"/>
  </a>
  <a href="https://whatsapp.com/channel/0029VbDSqdOFy72BrpK1I40c">
    <img src="https://img.shields.io/badge/Join%20WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Join WhatsApp"/>
  </a>
  <a href="https://chat.whatsapp.com/FfJZtyvL1PM46pLmInoHcZ">
    <img src="https://img.shields.io/badge/Support%20Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Support Group"/>
  </a>
</div>

---

## ⚙️ Features

- **Tag all group members** with the `.tagall` command
- **Admin restricted usage** (Only group admins can use certain commands)
- **Games** like Tic-Tac-Toe and Hangman for interactive group engagement
- **Text-to-Speech** with `.tts`
- **Sticker creation** with `.sticker`
- **Anti-link detection** for group safety
- **Warn and manage group members** with admin control

---

## 📖 About

The MEHTAB-MD WhatsApp Bot assists group admins by providing them with tools to efficiently manage large WhatsApp groups. The bot uses the Baileys library to interact with the WhatsApp Web API and supports multi-device features.

It is lightweight and can be easily customized to add more commands as per your requirements. The bot runs in a Node.js environment and provides pair code or QR code-based authentication to link your WhatsApp account.

---

## 🛠️ Setup & Installation

### Prerequisites

- Node.js installed on your system
- Git installed (for cloning the repository)

### Step-by-Step Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/themalik-g/MEHTAB-MD.git
    cd MEHTAB-MD
    ```

2. **Install the dependencies:**

    ```bash
    npm install
    ```

3. **Run the bot:**

    ```bash
    npm start
    ```
---

## One click vps deploy
Open your vps and creat a file named as index.js and past the following raw data:
```bash
/**
 * MEHTAB-MD - VPS Bootstrap (Levanter Style)
 * Upload ONLY this file to /home/container/index.js
 */

const { spawnSync, spawn } = require('child_process')
const { existsSync, rmSync } = require('fs')
const path = require('path')

const REPO_URL = 'https://github.com/themalik-g/MEHTAB-MD.git'
const BOT_DIR = 'mehtab-md'

let nodeRestartCount = 0
const maxNodeRestarts = 5
const restartWindow = 30000
let lastRestartTime = Date.now()

function startNode() {
  const child = spawn('node', ['index.js'], { cwd: BOT_DIR, stdio: 'inherit' })
  child.on('exit', (code) => {
    if (code !== 0) {
      const currentTime = Date.now()
      if (currentTime - lastRestartTime > restartWindow) nodeRestartCount = 0
      lastRestartTime = currentTime
      nodeRestartCount++
      if (nodeRestartCount > maxNodeRestarts) {
        console.error('[BOOT] ❌ Bot crashing continuously. Stopping retries...')
        return
      }
      console.log(`[BOOT] ⚠️ Bot exited (${code}). Restarting... (${nodeRestartCount}/${maxNodeRestarts})`)
      startNode()
    }
  })
}

function installDependencies() {
  console.log('[BOOT] 📥 Installing dependencies...')
  const result = spawnSync('npm', ['install'], { cwd: BOT_DIR, stdio: 'inherit', timeout: 300000 })
  if (result.error || result.status !== 0) {
    console.error('[BOOT] ❌ npm install failed.')
    process.exit(1)
  }
  console.log('[BOOT] ✅ Dependencies installed.')
}

function cloneRepository() {
  console.log('[BOOT] 🌐 Cloning MEHTAB-MD from GitHub...')
  const result = spawnSync('git', ['clone', '--depth', '1', REPO_URL, BOT_DIR], {
    stdio: 'inherit',
    timeout: 180000,
  })
  if (result.error || result.status !== 0) {
    console.error('[BOOT] ❌ Git clone failed.')
    process.exit(1)
  }
  console.log('[BOOT] ✅ Repository cloned.')
  installDependencies()
}

if (!existsSync(BOT_DIR)) {
  cloneRepository()
} else if (!existsSync(path.join(BOT_DIR, 'package.json'))) {
  console.log('[BOOT] ⚠️ Bot folder corrupted. Re-cloning...')
  rmSync(BOT_DIR, { recursive: true, force: true })
  cloneRepository()
} else if (!existsSync(path.join(BOT_DIR, 'node_modules'))) {
  installDependencies()
} else {
  console.log('[BOOT] 📁 Bot files found. Skipping download.')
}

console.log('[BOOT] 🚀 Starting MEHTAB-MD...\n')
startNode()
```
Terminal will ask you to enter number and will display pairing code automatically

---

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Contributions

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/themalik-g/MEHTAB-MD/issues).

---

## 🌟 Show your support

If you like this project, please give it a [⭐️ star on GitHub](https://github.com/themalik-g/MEHTAB-MD)!

## Credits

- [MALIK MEHTAB](https://github.com/themalik-g)
- [Baileys](https://github.com/adiwajshing/Baileys)

---

## ⚠️ Important Warning

**Note:** This bot is created for educational purposes only. This is NOT an official WhatsApp bot. Using this bot may lead to your WhatsApp account being banned. Use it at your own risk. The developers will not be responsible for any consequences or account bans that may occur while using this bot.

## 📝 Legal

- This project is not affiliated with, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates or subsidiaries.
- This is an independent and unofficial software. Use at your own risk.
- Do not spam people with this bot.
- Do not use this bot to send bulk messages or for illegal purposes.
- The developers assume no liability and are not responsible for any misuse or damage caused by this program.

### License
This project is licensed under the MIT License. However, you must:
- Use this software in compliance with all applicable laws and regulations
- Include original license and copyright notices
- Credit original authors
- Not use for spam or malicious purposes

## 📜 Copyright Notice

Copyright (c) 2024 MALIK MEHTAB. All rights reserved.
