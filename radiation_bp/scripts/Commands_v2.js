// ============================================
// Commands.js v2 - HARDCORE EDITION
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager_v2.js";

class CommandsManager {
    constructor() {
        this.registerCommands();
    }
    
    registerCommands() {
        world.beforeEvents.chatSend.subscribe((data) => {
            const { sender, message, cancel } = data;
            
            if (message.startsWith("/rad")) {
                cancel = true;
                const args = message.slice(4).trim().split(" ");
                const command = args[0]?.toLowerCase();
                
                switch(command) {
                    case "set":
                        this.handleSetCommand(sender, args);
                        break;
                    case "add":
                        this.handleAddCommand(sender, args);
                        break;
                    case "reset":
                        this.handleResetCommand(sender);
                        break;
                    case "info":
                        this.handleInfoCommand(sender);
                        break;
                    case "geiger":
                        this.handleGeigerCommand(sender);
                        break;
                    case "help":
                        this.handleHelpCommand(sender);
                        break;
                    default:
                        this.handleHelpCommand(sender);
                }
            }
        });
    }
    
    handleSetCommand(player, args) {
        const level = parseInt(args[1]);
        if (isNaN(level) || level < 0 || level > 100) {
            player.sendMessage(" §cИспользование: /rad set <уровень 0-100> §r");
            return;
        }
        
        radiationManager.setRadiationLevel(player, level);
        player.sendMessage(` §aУровень радиации установлен на ${level}% §r`);
    }
    
    handleAddCommand(player, args) {
        const amount = parseInt(args[1]);
        if (isNaN(amount)) {
            player.sendMessage(" §cИспользование: /rad add <количество> §r");
            return;
        }
        
        const currentData = radiationManager.playerRadiation.get(player.id);
        const currentLevel = currentData?.level || 0;
        const newLevel = Math.min(100, currentLevel + amount);
        
        radiationManager.setRadiationLevel(player, newLevel);
        player.sendMessage(` §aДобавлено ${amount}% радиации. Новый уровень: ${newLevel}% §r`);
    }
    
    handleResetCommand(player) {
        radiationManager.setRadiationLevel(player, 0);
        player.sendMessage(" §aРадиация сброшена! §r");
    }
    
    handleInfoCommand(player) {
        const data = radiationManager.playerRadiation.get(player.id);
        const level = data?.level || 0;
        const timer = data?.countdownTimer;
        
        let message = `\n §l §6☢️ ИНФОРМАЦИЯ О РАДИАЦИИ §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §7Уровень: ${level}% §r\n`;
        
        if (timer !== undefined) {
            message += `  §7Таймер: ${timer} сек §r\n`;
        } else {
            message += `  §aТаймер не активен §r\n`;
        }
        
        const check = radiationManager.isInRadiationZone(player);
        if (check.inZone) {
            message += `  §c☢️ В ЗОНЕ ЗАРАЖЕНИЯ! §r\n`;
            message += `  §7Интенсивность: ${Math.round(check.intensity)}% §r\n`;
            message += `  §7До центра: ${Math.round(check.distance)} блоков §r\n`;
        } else {
            message += `  §a✓ Вне зоны заражения §r\n`;
        }
        
        message += ` §7══════════════════════════ §r\n`;
        
        player.sendMessage(message);
    }
    
    handleGeigerCommand(player) {
        const hudManager = require("./HUD_v2.js").hudManager;
        hudManager.showGeigerInfo(player);
    }
    
    handleHelpCommand(player) {
        let message = `\n §l §6☢️ РАДИАЦИЯ - ПОМОЩЬ §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §e/rad set <0-100> §r- Установить уровень §r\n`;
        message += `  §e/rad add <кол-во> §r- Добавить радиацию §r\n`;
        message += `  §e/rad reset §r- Сбросить радиацию §r\n`;
        message += `  §e/rad info §r- Информация §r\n`;
        message += `  §e/rad geiger §r- Счётчик Гейгера §r\n`;
        message += `  §e/rad help §r- Эта справка §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        
        player.sendMessage(message);
    }
}

export const commandsManager = new CommandsManager();
