const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require('canvas');
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

// Try to register robotic-style fonts
try {
    registerFont(path.join(__dirname, 'fonts', 'Orbitron-Bold.ttf'), { family: 'Orbitron', weight: 'bold' });
    registerFont(path.join(__dirname, 'fonts', 'RobotoMono-Italic.ttf'), { family: 'Roboto Mono', style: 'italic' });
} catch (e) {
    console.log('Custom fonts not found, using default fonts');
}

module.exports = {
    config: {
        name: "help",
        version: "4.5",
        author: "𝕴𝖗𝖋𝖆𝖓",
        countDown: 5,
        role: 0,
        description: "View command information with advanced robotic interface",
        category: "info",
        guide: {
            en: "{pn} [command] - View command details\n{pn} all - View all commands\n{pn} c [category] - View commands in category"
        }
    },

    langs: {
        en: {
            helpHeader: "🤖 ARYAN⚡BOT COMMAND SYSTEM",
            commandNotFound: "⚠️ Command '{command}' not found!",
            doNotHave: "None",
            roleText0: "👥 All Users",
            roleText1: "👑 Group Admins",
            roleText2: "⚡ Bot Admins",
            categoryEmpty: "❌ No commands found in category: {category}",
            totalCommands: "📊 Total Commands: {total}",
            categoryTitle: "📁 Category: {category}",
            commandList: "📋 Command List:",
            commandDetails: "📋 Command Details: {name}"
        }
    },

    onStart: async function({ message, args, event, threadsData, role, api }) {
        const { threadID } = event;
        const prefix = getPrefix(threadID);
        const commandName = args[0]?.toLowerCase();
        
        // Get thread information
        let threadInfo;
        try {
            threadInfo = await api.getThreadInfo(threadID);
        } catch (e) {
            console.error("Error getting thread info:", e);
            threadInfo = { threadName: "Unknown Group" };
        }
        
        const groupName = threadInfo.threadName || "Unknown Group";
        const memberCount = threadInfo.participantIDs ? threadInfo.participantIDs.length : 0;
        
        // Bot information
        const botOwner = "ARYAN CHAUCHAN";
        const botName = "ARYAN⚡BOT";
        const botVersion = "4.5";
        const globalPrefix = global.GoatBot.config.prefix;
        
        // Generate info canvas
        const infoCanvas = await this.generateInfoCanvas(
            groupName,
            memberCount,
            prefix,
            globalPrefix,
            botName,
            botOwner,
            botVersion
        );
        
        if (commandName === 'c' && args[1]) {
            const categoryArg = args[1].toUpperCase();
            const commandsInCategory = [];

            for (const [name, cmd] of commands) {
                if (cmd.config.role > 1 && role < cmd.config.role) continue;
                const category = cmd.config.category?.toUpperCase() || "GENERAL";
                if (category === categoryArg) {
                    commandsInCategory.push({ name });
                }
            }

            if (commandsInCategory.length === 0) {
                return message.reply(this.langs.en.categoryEmpty.replace(/{category}/g, categoryArg));
            }
            
            let commandList = this.langs.en.categoryTitle.replace(/{category}/g, categoryArg) + "\n\n";
            commandsInCategory.sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
                commandList += `• ${cmd.name}\n`;
            });
            
            commandList += `\n${this.langs.en.totalCommands.replace(/{total}/g, commandsInCategory.length)}`;

            return message.reply({
                body: commandList,
                attachment: infoCanvas
            });
        }

        if (!commandName || commandName === 'all') {
            const categories = new Map();
            let totalCommands = 0;

            for (const [name, cmd] of commands) {
                if (cmd.config.role > 1 && role < cmd.config.role) continue;

                const category = cmd.config.category?.toUpperCase() || "GENERAL";
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category).push({ name });
                totalCommands++;
            }

            const sortedCategories = [...categories.keys()].sort();
            let commandList = this.langs.en.commandList + "\n\n";
            
            for (const category of sortedCategories) {
                const commandsInCategory = categories.get(category).sort((a, b) => a.name.localeCompare(b.name));
                
                commandList += `🍓 ${category} (${commandsInCategory.length} commands):\n`;
                
                // Show only first 5 commands per category to avoid message being too long
                commandsInCategory.slice(0, 5).forEach(cmd => {
                    commandList += `• ${cmd.name}\n`;
                });
                
                if (commandsInCategory.length > 5) {
                    commandList += `💕 ...${commandsInCategory.length - 5} more commands\n`;
                }
                
                commandList += "\n";
            }
            
            commandList += this.langs.en.totalCommands.replace(/{total}/g, totalCommands);
            commandList += `\n\nUse "${prefix}help c [category]" to see all commands in a category`;
            commandList += `\nUse "${prefix}help [command]" to see details of a specific command`;

            return message.reply({
                body: commandList,
                attachment: infoCanvas
            });
        }

        let cmd = commands.get(commandName) || commands.get(aliases.get(commandName));
        if (!cmd) {
            return message.reply(this.langs.en.commandNotFound.replace(/{command}/g, commandName));
        }

        const config = cmd.config;
        const description = config.description?.en || config.description || "No description";
        const aliasesList = config.aliases?.join(", ") || this.langs.en.doNotHave;
        const category = config.category?.toUpperCase() || "GENERAL";
        
        let roleText;
        switch(config.role) {
            case 1: roleText = this.langs.en.roleText1; break;
            case 2: roleText = this.langs.en.roleText2; break;
            default: roleText = this.langs.en.roleText0;
        }
        
        let guide = config.guide?.en || config.usage || config.guide || "No usage guide available";
        if (typeof guide === "object") guide = guide.body;
        guide = guide.replace(/\{prefix\}/g, prefix).replace(/\{name\}/g, config.name).replace(/\{pn\}/g, prefix + config.name);
        
        let commandDetails = this.langs.en.commandDetails.replace(/{name}/g, config.name) + "\n\n";
        commandDetails += `📝 Description: ${description}\n`;
        commandDetails += `📂 Category: ${category}\n`;
        commandDetails += `🔤 Aliases: ${aliasesList}\n`;
        commandDetails += `🏷️ Version: ${config.version}\n`;
        commandDetails += `🔒 Permissions: ${roleText}\n`;
        commandDetails += `⏱️ Cooldown: ${config.countDown || 1}s\n`;
        commandDetails += `👤 Author: ${config.author || "Unknown"}\n\n`;
        commandDetails += `🛠️ Usage:\n${guide}`;

        return message.reply({
            body: commandDetails,
            attachment: infoCanvas
        });
    },

    generateInfoCanvas: async function(groupName, memberCount, groupPrefix, globalPrefix, botName, botOwner, botVersion) {
        const canvas = createCanvas(800, 500);
        const ctx = canvas.getContext('2d');
        
        // Draw futuristic background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#001125');
        gradient.addColorStop(0.5, '#001933');
        gradient.addColorStop(1, '#000d1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw advanced circuit patterns
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let y = 40; y < canvas.height; y += 35) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        for (let x = 40; x < canvas.width; x += 35) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Draw circuit nodes with glow effect
        for (let y = 40; y < canvas.height; y += 35) {
            for (let x = 40; x < canvas.width; x += 35) {
                // Outer glow
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.fill();
                
                // Inner node
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#00ffff';
                ctx.fill();
            }
        }

        // Draw data streams
        for (let i = 0; i < 3; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            
            const streamGradient = ctx.createLinearGradient(startX, startY, startX + 200, startY + 200);
            streamGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
            streamGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
            streamGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.strokeStyle = streamGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(
                startX + 100, startY - 50,
                startX + 150, startY + 100,
                startX + 200, startY + 50
            );
            ctx.stroke();
        }
        
        // Draw main header
        ctx.font = 'bold 32px Orbitron, Arial';
        const titleText = '🤖 ARYAN⚡BOT SYSTEM INFO';
        
        // Text shadow
        ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.fillText(titleText, canvas.width/2 - ctx.measureText(titleText).width/2 + 2, 42);
        
        // Main text
        ctx.fillStyle = '#00ffff';
        ctx.fillText(titleText, canvas.width/2 - ctx.measureText(titleText).width/2, 40);
        
        // Draw info box
        const boxWidth = 700;
        const boxHeight = 350;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = 70;
        
        // Box background
        ctx.fillStyle = 'rgba(0, 20, 40, 0.7)';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 15);
        
        // Draw group info
        ctx.font = 'bold 24px Orbitron, Arial';
        ctx.fillStyle = '#00ffaa';
        ctx.textAlign = 'left';
        ctx.fillText('👥 GROUP INFORMATION', boxX + 20, boxY + 35);
        
        ctx.font = 'bold 20px Orbitron, Arial';
        ctx.fillStyle = '#ffffff';
        
        const groupInfoLines = [
            `💬 Name: ${groupName}`,
            `👨‍👩‍👧‍👦 Members: ${memberCount}`,
            `🔤 Prefix: ${groupPrefix}`
        ];
        
        groupInfoLines.forEach((line, i) => {
            ctx.fillText(line, boxX + 30, boxY + 70 + (i * 35));
        });
        
        // Draw separator
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + 20, boxY + 150);
        ctx.lineTo(boxX + boxWidth - 20, boxY + 150);
        ctx.stroke();
        
        // Draw bot info
        ctx.font = 'bold 24px Orbitron, Arial';
        ctx.fillStyle = '#00ffaa';
        ctx.fillText('🤖 BOT INFORMATION', boxX + 20, boxY + 185);
        
        ctx.font = 'bold 20px Orbitron, Arial';
        ctx.fillStyle = '#ffffff';
        
        const botInfoLines = [
            `🌐 Name: ${botName}`,
            `⚡ Version: ${botVersion}`,
            `🔤 Global Prefix: ${globalPrefix}`,
            `👑 Owner: ${botOwner}`
        ];
        
        botInfoLines.forEach((line, i) => {
            ctx.fillText(line, boxX + 30, boxY + 220 + (i * 35));
        });
        
        // Draw footer
        ctx.font = 'italic 16px Roboto Mono, Arial';
        ctx.fillStyle = '#00aaaa';
        ctx.textAlign = 'center';
        ctx.fillText('Type "help" in chat to see command list', canvas.width/2, boxY + boxHeight + 30);
        
        // Convert canvas to buffer
        const buffer = canvas.toBuffer('image/png');
        const pathSave = path.join(__dirname, 'tmp', 'info_canvas.png');
        
        // Ensure tmp directory exists
        if (!fs.existsSync(path.dirname(pathSave))) {
            fs.mkdirSync(path.dirname(pathSave), { recursive: true });
        }
        
        fs.writeFileSync(pathSave, buffer);
        
        return fs.createReadStream(pathSave);
    }
};

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
            }
