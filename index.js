const https = require("https");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");
const Discord = require("discord.js-selfbot-v13");
const os = require("os");

const SCRIPT_URL = "https://raw.githubusercontent.com/takenbyfbi/sirius-/main/index.js";
const LOCAL_SCRIPT = path.join(__dirname, "index.js");

async function checkUpdateAndRun() {
  return new Promise((resolve, reject) => {
    console.log("Checking for script updates...");
    https.get(SCRIPT_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch update: status code ${res.statusCode}`));
        return;
      }
      let remoteData = "";
      res.on("data", chunk => remoteData += chunk);
      res.on("end", () => {
        let localData = "";
        try {
          localData = fs.readFileSync(LOCAL_SCRIPT, "utf8");
          console.log("Local script loaded.");
        } catch {
          console.log("Local script not found, will create new.");
        }

        if (localData !== remoteData) {
          console.log("Update found! Updating local script...");
          fs.writeFileSync(LOCAL_SCRIPT, remoteData);
          console.log("Update done restart sirius...");

          spawn(process.argv[0], [LOCAL_SCRIPT], { stdio: "inherit" });
          process.exit(0); 
        } else {
          console.log("No update found.");
          resolve(); 
        }
      });
    }).on("error", (err) => {
      console.error("Error while checking update:", err);
      reject(err);
    });
  });
}

(async () => {
  try {
    await checkUpdateAndRun();

    const settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));
    const client = new Discord.Client();

    let mata1 = false;
    let mata2 = 1000;

    client.on("ready", () => {
      console.clear();
      console.log(`scriptulet on ${client.user.tag}`);
    });

    client.on("messageCreate", async (message) => {
      if (message.author.id !== client.user.id) return;

      const full = message.content.trim();
      const content = full.toLowerCase();

      if (content === "!cpu") {
        const cpuModel = os.cpus()[0].model;
        await message.channel.send(`cpu: ${cpuModel}`);
      } else if (content === "!ram") {
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        await message.channel.send(`ram: ${totalMem} MB`);
      } else if (content.startsWith("!delay")) {
        const parts = full.split(" ");
        if (parts.length === 2) {
          const sec = parseFloat(parts[1]);
          if (!isNaN(sec) && sec >= 0) {
            mata2 = sec * 1000;
          }
        }
      } else if (content === "!start") {
        if (mata1) return;
        mata1 = true;
        const lines = fs.readFileSync("notepad.txt", "utf8").split(/\r?\n/);
        for (const line of lines) {
          if (!mata1) break;
          if (line.trim() !== "") {
            try {
              await message.channel.send(line);
            } catch {
              mata1 = false;
              break;
            }
            await new Promise(res => setTimeout(res, mata2));
          }
        }
        mata1 = false;
      } else if (content === "!stop") {
        mata1 = false;
      } else if (content === "!help") {
        try {
          const helpText = fs.readFileSync("help.txt", "utf8");
          await message.channel.send(helpText);
        } catch {}
      }
    });

    client.login(settings.token);

  } catch (e) {
    console.error("Fatal error:", e);
    process.exit(1);
  }
})();
