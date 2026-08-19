// ============================================
// Commands.js v2 - HARDCORE EDITION
// ============================================
// Команды для управления радиацией
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager.js";
import { hudManager } from "./HUD.js";
import { bogCompatibility } from "./BoGCompatibility.js";

class CommandManager {
    constructor() {
        // Регистрация команд
        this.registerCommands();
    }
    
    // ============================================
    // Регистрация команд
    // ============================================
    registerCommands() {
        // Команда: /radiation
        world.beforeEvents.chatSend.subscribe((event) => {
            const message = event.message.toLowerCase().trim();
            const player = event.sender;
            
            if (message.startsWith("/radiation") || message.startsWith("/rad")) {
                event.cancel = true;
                this.handleRadiationCommand(player, message);
            }
            
            if (message.startsWith("/geiger")) {
                event.cancel = true;
                this.handleGeigerCommand(player, message);
            }
            
            if (message.startsWith("/fallout")) {
                event.cancel = true;
                this.handleFalloutCommand(player, message);
            }
            
            if (message.startsWith("/clearzones")) {
                event.cancel = true;
                this.handleClearZonesCommand(player, message);
            }
            
            if (message.startsWith("/bombinfo")) {
                event.cancel = true;
                this.handleBombInfoCommand(player, message);
            }
        });
    }
    
    // ============================================
    // Команда: /radiation
    // ============================================
    handleRadiationCommand(player, message) {
        const args = message.split(" ");
        
        // /radiation - показать статус
        if (args.length === 1) {
            const radiationLevel = radiationManager.playerRadiation.get(player.id)?.level || 0;
            const check = radiationManager.isInRadiationZone(player);
            
            let response = `\n §l §6☢️ РАДИАЦИЯ §r\n`;
            response += ` §7══════════════════════════ §r\n`;
            response += `  §7Ваш уровень: ${this.getRadiationColor(radiationLevel)}${Math.round(radiationLevel)}% §r\n`;
            
            if (check.inZone) {
                const intensity = Math.round(check.intensity);
                response += `  §c☢️ ВЫ В ЗОНЕ ЗАРАЖЕНИЯ! §r\n`;
                response += `  §7Интенсивность: §c${intensity}% §r\n`;
                response += `  §eБЕГИТЕ! §r\n`;
            } else {
                response += `  §a✓ Вне зоны §r\n`;
            }
            
            response += ` §7══════════════════════════ §r\n`;
            
            player.sendMessage(response);
            return;
        }
        
        // /radiation set <level> - установить уровень радиации
        if (args[1] === "set" && args[2]) {
            const level = parseFloat(args[2]);
            if (isNaN(level) || level < 0 || level > 100) {
                player.sendMessage(` §cОшибка: уровень должен быть от 0 до 100`);
                return;
            }
            
            radiationManager.playerRadiation.set(player.id, {
                level: level,
                lastUpdate: Date.now()
            });
            
            player.sendMessage(` §aУровень радиации установлен на ${level}%`);
            return;
        }
        
        // /radiation help - помощь
        if (args[1] === "help" || args[1] === "h") {
            let help = `\n §l §6☢️ КОМАНДЫ РАДИАЦИИ §r\n`;
            help += ` §7══════════════════════════ §r\n`;
            help += `  §f/radiation §7- Показать статус §r\n`;
            help += `  §f/radiation set <level> §7- Установить уровень §r\n`;
            help += `  §f/geiger §7- Счётчик Гейгера §r\n`;
            help += `  §f/fallout <type> §7- Создать зону §r\n`;
            help += `  §f/clearzones §7- Очистить все зоны §r\n`;
            help += `  §f/bombinfo <type> §7- Инфо о бомбе §r\n`;
            help += ` §7══════════════════════════ §r\n`;
            
            player.sendMessage(help);
            return;
        }
        
        player.sendMessage(` §cНеизвестная команда. Используйте /radiation help`);
    }
    
    // ============================================
    // Команда: /geiger
    // ============================================
    handleGeigerCommand(player, message) {
        hudManager.showGeigerInfo(player);
    }
    
    // ============================================
    // Команда: /fallout
    // ============================================
    handleFalloutCommand(player, message) {
        const args = message.split(" ");
        const pos = player.location;
        
        // /fallout [type] - создать зону в позиции игрока
        const bombType = args[1] || "atomic";
        
        const zone = bogCompatibility.manualCreateZone(pos.x, pos.y, pos.z, bombType);
        
        player.sendMessage(` §a☢️ Зона радиации создана!`);
        player.sendMessage(` §7Тип: §f${bombType} §r`);
        player.sendMessage(` §7Радиус: §f${zone.radius} блоков §r`);
    }
    
    // ============================================
    // Команда: /clearzones
    // ============================================
    handleClearZonesCommand(player, message) {
        radiationManager.clearAllZones();
        player.sendMessage(` §aВсе зоны радиации очищены!`);
    }
    
    // ============================================
    // Команда: /bombinfo
    // ============================================
    handleBombInfoCommand(player, message) {
        const args = message.split(" ");
        const bombType = args[1] || "atomic";
        
        const info = bogCompatibility.getBombInfo(bombType);
        
        if (info.error) {
            player.sendMessage(` §cОшибка: ${info.error}`);
            player.sendMessage(` §7Доступные типы: §f${info.available.join(", ")} §r`);
            return;
        }
        
        let response = `\n §l §6💣 ${info.name} §r\n`;
        response += ` §7══════════════════════════ §r\n`;
        response += `  §7Радиус взрыва: §f${info.radius} блоков §r\n`;
        response += `  §7Радиус заражения: §c${info.falloutRadius} блоков §r\n`;
        response += `  §7Интенсивность: §c${info.intensity}% §r\n`;
        response += `  §7Длительность: §e${info.durationMinutes} мин §r\n`;
        response += ` §7══════════════════════════ §r\n`;
        
        player.sendMessage(response);
    }
    
    // ============================================
    // Цвет уровня радиации
    // ============================================
    getRadiationColor(level) {
        if (level < 20) return " §a";
        if (level < 40) return " §e";
        if (level < 60) return " §6";
        if (level < 80) return " §c";
        return " §l §c";
    }
}

// ============================================
// Экспорт
// ============================================
export const commandManager = new CommandManager();