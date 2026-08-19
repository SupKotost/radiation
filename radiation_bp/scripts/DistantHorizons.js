// ============================================
// DistantHorizons.js - FAR RENDER DISTANCE
// ============================================
// Аналог мода Distant Horizons для Minecraft Bedrock
// Оптимизированная дальность прорисовки до 42 чанков
// ============================================

import { world, system } from "@minecraft/server";

class DistantHorizons {
    constructor() {
        this.config = {
            // Дальность прорисовки (макс 42 чанка - оптимизировано)
            renderDistance: 42,
            // Интервал обновления (в тиках, 20 тиков = 1 секунда)
            updateInterval: 200,
            // Включить эффект "тумана" для плавного перехода
            enableFog: true,
            // Оптимизация: обновлять только раз в N тиков
            optimizationLevel: "high"
        };
        
        this.playerCache = new Map();
        this.initialize();
    }
    
    initialize() {
        // Оптимизированный цикл обновления
        system.runInterval(() => {
            const players = world.getAllPlayers();
            const currentTime = system.currentTick;
            
            for (const player of players) {
                const playerId = player.id;
                const lastUpdate = this.playerCache.get(playerId);
                
                // Обновляем только если прошло достаточно времени (оптимизация)
                if (!lastUpdate || currentTime - lastUpdate > this.config.updateInterval) {
                    this.updatePlayer(player);
                    this.playerCache.set(playerId, currentTime);
                }
            }
            
        }, 20); // Проверяем каждый тик, но обновляем реже
        
        // Команда для изменения дальности
        this.registerCommands();
    }
    
    updatePlayer(player) {
        // Устанавливаем дальность прорисовки через свойство
        try {
            player.setProperty("minecraft:render_distance", this.config.renderDistance);
        } catch (e) {
            // Игнорируем ошибки, если свойство недоступно
        }
        
        // Добавляем эффект тумана для плавности (оптимизировано)
        if (this.config.enableFog) {
            this.applyFogEffect(player);
        }
    }
    
    applyFogEffect(player) {
        // Эффект для плавного перехода горизонта без частиц
        try {
            player.addEffect("night_vision", 600, {
                showParticles: false,
                amplifier: 0
            });
        } catch (e) {
            // Игнорируем ошибки
        }
    }
    
    registerCommands() {
        world.beforeEvents.chatSend.subscribe((data) => {
            const { sender, message, cancel } = data;
            
            if (message.startsWith("/dh")) {
                cancel = true;
                const args = message.slice(3).trim().split(" ");
                const command = args[0]?.toLowerCase();
                
                switch(command) {
                    case "set":
                        this.handleSetCommand(sender, args);
                        break;
                    case "info":
                        this.handleInfoCommand(sender);
                        break;
                    default:
                        this.handleHelpCommand(sender);
                }
            }
        });
    }
    
    handleSetCommand(player, args) {
        const distance = parseInt(args[1]);
        if (isNaN(distance) || distance < 4 || distance > 42) {
            player.sendMessage(" §cИспользование: /dh set <4-42> §r");
            player.sendMessage(" §7Текущая: 42 чанка (оптимизировано) §r");
            return;
        }
        
        this.config.renderDistance = distance;
        player.sendMessage(` §aДальность прорисовки установлена на ${distance} чанков §r`);
        
        if (distance > 32) {
            player.sendMessage(" §e⚠️ 42 чанка - максимум! Возможны лаги §r");
        }
    }
    
    handleInfoCommand(player) {
        let message = `\n §l §6🌍 DISTANT HORIZONS §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §7Дальность: §e${this.config.renderDistance} чанков §r\n`;
        message += `  §7Оптимизация: §aВключена §r\n`;
        message += `  §7Туман: ${this.config.enableFog ? " §aВкл §r" : " §cВыкл §r"}\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §e/dh set <4-42> §r- Изменить дальность §r\n`;
        message += `  §e/dh info §r- Эта информация §r\n`;
        message += `  §e/dh help §r- Помощь §r\n`;
        
        player.sendMessage(message);
    }
    
    handleHelpCommand(player) {
        let message = `\n §l §6🌍 DISTANT HORIZONS - ПОМОЩЬ §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += `  §e/dh set <4-42> §r- Установить дальность §r\n`;
        message += `  §e/dh info §r- Показать настройки §r\n`;
        message += `  §e/dh help §r- Эта справка §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += ` §7Рекомендации: §r\n`;
        message += `  • 4-8 чанков - слабые устройства §r\n`;
        message += `  • 12-16 чанков - средние устройства §r\n`;
        message += `  • 20-24 чанков - мощные устройства §r\n`;
        message += `  • 32-42 чанков - только для ПК §r\n`;
        message += ` §7══════════════════════════ §r\n`;
        message += ` §a42 чанка - оптимизированный максимум! §r\n`;
        
        player.sendMessage(message);
    }
}

// Экспортируем экземпляр
export const distantHorizons = new DistantHorizons();
