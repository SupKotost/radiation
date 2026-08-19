// ============================================
// HUD.js v2 - HARDCORE EDITION
// ============================================
// Отображение уровня радиации и таймера
// Счётчик Гейгера (звуковые эффекты)
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager.js";

class HUDManager {
    constructor() {
        // Настройки
        this.config = {
            // Показывать ли HUD
            enableHUD: true,
            
            // Показывать ли таймер
            enableTimer: true,
            
            // Звуковые эффекты (треск счётчика Гейгера)
            enableGeigerSound: true,
            
            // Частота треска (в секунду)
            geigerClickRate: 5,
            
            // Интервал обновления HUD (в тиках)
            updateInterval: 10 // 2 раза в секунду
        };
        
        // Запуск обновления HUD
        this.startHUDUpdate();
    }
    
    // ============================================
    // Обновление HUD для игрока
    // ============================================
    updateHUD(player) {
        if (!this.config.enableHUD) return;
        
        const playerId = player.id;
        const radiationLevel = radiationManager.playerRadiation.get(playerId)?.level || 0;
        const timer = radiationManager.countdownTimers.get(playerId);
        
        // Форматирование уровня радиации
        const radPercent = Math.round(radiationLevel);
        const radColor = this.getRadiationColor(radiationLevel);
        
        // Сообщение HUD
        let hudText = `\n §7══════════════════════════ §r\n`;
        hudText += `  §l §6☢️ РАДИАЦИЯ §r\n`;
        hudText += `  §7Уровень: ${radColor}${radPercent}% §r\n`;
        
        // Шкала радиации
        const barLength = 20;
        const filled = Math.round((radiationLevel / 100) * barLength);
        const empty = barLength - filled;
        const bar = " §a" + "█".repeat(filled) + " §7" + "█".repeat(empty);
        hudText += ` ${bar}\n`;
        
        // Таймер
        if (timer !== undefined && this.config.enableTimer) {
            const timerColor = timer > 10 ? " §a" : timer > 5 ? " §e" : " §c";
            hudText += `  §7Таймер: ${timerColor}${timer} сек §r\n`;
        }
        
        // Статус
        const check = radiationManager.isInRadiationZone(player);
        if (check.inZone) {
            const intensity = Math.round(check.intensity);
            hudText += `  §c☢️ ЗОНА ЗАРАЖЕНИЯ! §r\n`;
            hudText += `  §7Интенсивность: §c${intensity}% §r\n`;
        } else {
            hudText += `  §a✓ Безопасно §r\n`;
        }
        
        hudText += ` §7══════════════════════════ §r\n`;
        
        // Отправка игроку
        player.sendMessage(hudText);
    }
    
    // ============================================
    // Цвет уровня радиации
    // ============================================
    getRadiationColor(level) {
        if (level < 20) return " §a"; // Зелёный
        if (level < 40) return " §e"; // Жёлтый
        if (level < 60) return " §6"; // Оранжевый
        if (level < 80) return " §c"; // Красный
        return " §l §c"; // Жирный красный
    }
    
    // ============================================
    // Звук счётчика Гейгера
    // ============================================
    playGeigerClick(player, radiationLevel) {
        if (!this.config.enableGeigerSound) return;
        
        // Частота треска зависит от уровня радиации
        const clickRate = this.config.geigerClickRate * (radiationLevel / 100);
        
        if (Math.random() < clickRate / 20) { // 20 тиков в секунду
            player.playSound("note.bass", {
                location: player.location,
                volume: 0.5,
                pitch: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    // ============================================
    // Обновление HUD (каждые N тиков)
    // ============================================
    startHUDUpdate() {
        system.runInterval(() => {
            const players = world.getAllPlayers();
            
            for (const player of players) {
                // Обновление HUD
                this.updateHUD(player);
                
                // Звук счётчика Гейгера
                const radiationLevel = radiationManager.playerRadiation.get(player.id)?.level || 0;
                this.playGeigerClick(player, radiationLevel);
            }
            
        }, this.config.updateInterval);
    }
    
    // ============================================
    // Команда: /geiger
    // ============================================
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

// ============================================
// Экспорт
// ============================================
export const hudManager = new HUDManager();