// ============================================
// HUD.js v2 - HARDCORE EDITION
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager_v2.js";

class HUDManager {
    constructor() {
        this.config = {
            enableHUD: true,
            enableTimer: true,
            enableGeigerSound: true,
            geigerClickRate: 5,
            updateInterval: 10
        };
        this.startHUDUpdate();
    }
    
    updateHUD(player) {
        if (!this.config.enableHUD) return;
        
        const playerId = player.id;
        const radiationLevel = radiationManager.playerRadiation.get(playerId)?.level || 0;
        const timer = radiationManager.countdownTimers.get(playerId);
        
        const radPercent = Math.round(radiationLevel);
        const radColor = this.getRadiationColor(radiationLevel);
        
        let hudText = `\n §7══════════════════════════ §r\n`;
        hudText += `  §l §6☢️ РАДИАЦИЯ §r\n`;
        hudText += `  §7Уровень: ${radColor}${radPercent}% §r\n`;
        
        const barLength = 20;
        const filled = Math.round((radiationLevel / 100) * barLength);
        const empty = barLength - filled;
        const bar = " §a" + "█".repeat(filled) + " §7" + "█".repeat(empty);
        hudText += ` ${bar}\n`;
        
        if (timer !== undefined && this.config.enableTimer) {
            const timerColor = timer > 10 ? " §a" : timer > 5 ? " §e" : " §c";
            hudText += `  §7Таймер: ${timerColor}${timer} сек §r\n`;
        }
        
        const check = radiationManager.isInRadiationZone(player);
        if (check.inZone) {
            const intensity = Math.round(check.intensity);
            hudText += `  §c☢️ ЗОНА ЗАРАЖЕНИЯ! §r\n`;
            hudText += `  §7Интенсивность: §c${intensity}% §r\n`;
        } else {
            hudText += `  §a✓ Безопасно §r\n`;
        }
        
        hudText += ` §7══════════════════════════ §r\n`;
        
        player.sendMessage(hudText);
    }
    
    getRadiationColor(level) {
        if (level < 20) return " §a";
        if (level < 40) return " §e";
        if (level < 60) return " §6";
        if (level < 80) return " §c";
        return " §l §c";
    }
    
    playGeigerClick(player, radiationLevel) {
        if (!this.config.enableGeigerSound) return;
        
        const clickRate = this.config.geigerClickRate * (radiationLevel / 100);
        
        if (Math.random() < clickRate / 20) {
            player.playSound("note.bass", {
                location: player.location,
                volume: 0.5,
                pitch: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    startHUDUpdate() {
        system.runInterval(() => {
            const players = world.getAllPlayers();
            
            for (const player of players) {
                this.updateHUD(player);
                
                const radiationLevel = radiationManager.playerRadiation.get(player.id)?.level || 0;
                this.playGeigerClick(player, radiationLevel);
            }
            
        }, this.config.updateInterval);
    }
    
    showGeigerInfo(player) {
        const radiationLevel = radiationManager.playerRadiation.get(player.id)?.level || 0;
        const check = radiationManager.isInRadiationZone(player);
        
        let message = `\n §l §6📟 СЧЁТЧИК ГЕЙГЕРА §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §7Уровень радиации: ${this.getRadiationColor(radiationLevel)}${Math.round(radiationLevel)}% §r\n`;
        
        if (check.inZone) {
            const intensity = Math.round(check.intensity);
            const distance = Math.round(check.distance);
            message += `  §c☢️ В ЗОНЕ ЗАРАЖЕНИЯ! §r\n`;
            message += `  §7Интенсивность: §c${intensity}% §r\n`;
            message += `  §7До центра: §c${distance} блоков §r\n`;
            message += `  §eБЕГИТЕ! §r\n`;
        } else {
            message += `  §a✓ Вне зоны заражения §r\n`;
            message += `  §aБезопасно §r\n`;
        }
        
        message += ` §7══════════════════════════ §r\n`;
        
        player.sendMessage(message);
    }
}

export const hudManager = new HUDManager();
