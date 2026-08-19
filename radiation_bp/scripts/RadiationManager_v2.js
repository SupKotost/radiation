// ============================================
// RadiationManager.js v2 - HARDCORE EDITION
// ============================================
// Все на равных: кто не сьебал за 30 секунд - тому пизда
// Без исключений, без защитных костюмов, без иммунитета
// ============================================

import { world, system, EntityEffectTypes, Effect } from "@minecraft/server";

class RadiationManager {
    constructor() {
        // Зоны радиации: [{x, y, z, radius, intensity, duration, createTime}]
        this.radiationZones = [];
        
        // Уровень радиации у игроков: Map<playerId, {level, lastUpdate}>
        this.playerRadiation = new Map();
        
        // Настройки
        this.config = {
            // Время на побег (секунды)
            escapeTime: 30,
            
            // Урон от радиации (в секунду)
            radiationDamage: 2,
            
            // Максимальный уровень радиации
            maxRadiation: 100,
            
            // Скорость спада радиации (в секунду)
            radiationDecay: 1,
            
            // Включить ли звук сирены
            enableSiren: true,
            
            // Включить ли сообщения в чат
            enableChatMessages: true
        };
        
        // Таймер обратного отсчёта
        this.countdownTimers = new Map();
        
        // Запуск игрового тика
        this.startGameTick();
    }
    
    // ============================================
    // Создание зоны радиации
    // ============================================
    addZone(x, y, z, radius, intensity, duration = 600) {
        const zone = {
            x: Math.floor(x),
            y: Math.floor(y),
            z: Math.floor(z),
            radius: radius,
            intensity: intensity, // 0-100
            duration: duration, // в секундах
            createTime: Date.now()
        };
        
        this.radiationZones.push(zone);
        
        // Сообщение в чат
        if (this.config.enableChatMessages) {
            world.sendMessage(`☢️ §cОБНАРУЖЕНА РАДИОАКТИВНАЯ ЗОНА!`);
            world.sendMessage(` §7Координаты: §f${x}, ${y}, ${z}`);
            world.sendMessage(` §7Радиус: §f${radius} блоков`);
            world.sendMessage(` §7Интенсивность: §f${intensity}%`);
            world.sendMessage(` §7Длительность: §f${duration} сек`);
        }
        
        return zone;
    }
    
    // ============================================
    // Создание зоны после ядерного взрыва
    // ============================================
    createNuclearFallout(x, y, z, explosionRadius) {
        // Радиус зоны заражения = 1.5x от радиуса взрыва
        const falloutRadius = explosionRadius * 1.5;
        
        // Интенсивность зависит от типа бомбы
        const intensity = 80; // 80% - очень опасно
        
        // Длительность: 10 минут (600 секунд)
        const duration = 600;
        
        return this.addZone(x, y, z, falloutRadius, intensity, duration);
    }
    
    // ============================================
    // Проверка: находится ли игрок в зоне радиации
    // ============================================
    isInRadiationZone(player) {
        const pos = player.location;
        
        for (const zone of this.radiationZones) {
            // Расстояние от игрока до центра зоны
            const dx = pos.x - zone.x;
            const dy = pos.y - zone.y;
            const dz = pos.z - zone.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Игрок в зоне?
            if (distance <= zone.radius) {
                return {
                    inZone: true,
                    zone: zone,
                    distance: distance,
                    intensity: zone.intensity * (1 - distance / zone.radius)
                };
            }
        }
        
        return { inZone: false };
    }
    
    // ============================================
    // Обновление уровня радиации у игрока
    // ============================================
    updatePlayerRadiation(player) {
        const playerId = player.id;
        const check = this.isInRadiationZone(player);
        
        if (!this.playerRadiation.has(playerId)) {
            this.playerRadiation.set(playerId, {
                level: 0,
                lastUpdate: Date.now()
            });
        }
        
        const playerRad = this.playerRadiation.get(playerId);
        const now = Date.now();
        const deltaTime = (now - playerRad.lastUpdate) / 1000; // в секундах
        
        if (check.inZone) {
            // Игрок в зоне - радиация растёт
            const intensity = check.intensity;
            playerRad.level = Math.min(
                this.config.maxRadiation,
                playerRad.level + intensity * deltaTime
            );
        } else {
            // Игрок не в зоне - радиация спадает
            playerRad.level = Math.max(
                0,
                playerRad.level - this.config.radiationDecay * deltaTime
            );
        }
        
        playerRad.lastUpdate = now;
        this.playerRadiation.set(playerId, playerRad);
        
        return playerRad.level;
    }
    
    // ============================================
    // Нанесение урона от радиации
    // ============================================
    applyRadiationDamage(player, radiationLevel) {
        // Урон пропорционален уровню радиации
        const damage = (radiationLevel / 100) * this.config.radiationDamage;
        
        if (damage > 0) {
            // Хардкор: никаких исключений, все получают урон
            player.applyDamage(damage, {
                cause: "magic", // Магический урон (радиация)
                damageSource: {
                    causingEntity: player,
                    type: "magic"
                }
            });
            
            // Визуальный эффект (частицы)
            player.spawnParticle("minecraft:spell_effect", player.location);
        }
    }
    
    // ============================================
    // Таймер обратного отсчёта (30 секунд)
    // ============================================
    startCountdown(player, duration = 30) {
        const playerId = player.id;
        let timeLeft = duration;
        
        // Сообщение о начале отсчёта
        if (this.config.enableChatMessages) {
            player.sendMessage(`\n☢️ §cВНИМАНИЕ! ОБНАРУЖЕНА РАДИАЦИЯ!`);
            player.sendMessage(` §7У вас есть §f${duration} секунд §7на побег!`);
            player.sendMessage(` §eБЕГИТЕ! §r\n`);
        }
        
        // Запуск таймера
        const timerId = system.runInterval(() => {
            timeLeft--;
            
            // Обновление таймера
            this.countdownTimers.set(playerId, timeLeft);
            
            // Отсчёт
            if (timeLeft > 0) {
                // Цвет меняется в зависимости от времени
                let color = " §a"; // Зелёный
                if (timeLeft <= 20) color = " §e"; // Жёлтый
                if (timeLeft <= 10) color = " §c"; // Красный
                if (timeLeft <= 5) color = " §l §c"; // Жирный красный
                
                if (this.config.enableChatMessages) {
                    player.sendMessage(`${color}⏱ Осталось: ${timeLeft} сек`);
                }
                
                // Звук сирены (последние 10 секунд)
                if (this.config.enableSiren && timeLeft <= 10) {
                    player.playSound("mob.ghast.scream", {
                        location: player.location,
                        volume: 1,
                        pitch: 1
                    });
                }
            } else {
                // Время вышло
                system.clearRun(timerId);
                this.countdownTimers.delete(playerId);
                
                if (this.config.enableChatMessages) {
                    player.sendMessage(`\n §l §c☢️ ВРЕМЯ ВЫШЛО! §r`);
                    player.sendMessage(` §cТеперь радиация убьёт тебя... §r\n`);
                }
                
                // Звук взрыва
                player.playSound("random.explode", {
                    location: player.location,
                    volume: 1,
                    pitch: 1
                });
            }
        }, 20); // Каждую секунду (20 тиков)
        
        return timerId;
    }
    
    // ============================================
    // Игровой тик (обновление каждый тик)
    // ============================================
    startGameTick() {
        system.runInterval(() => {
            const players = world.getAllPlayers();
            
            for (const player of players) {
                // Обновление радиации
                const radiationLevel = this.updatePlayerRadiation(player);
                
                // Нанесение урона (если радиация > 0)
                if (radiationLevel > 0) {
                    this.applyRadiationDamage(player, radiationLevel);
                }
                
                // Проверка: игрок в зоне радиации?
                const check = this.isInRadiationZone(player);
                if (check.inZone && !this.countdownTimers.has(player.id)) {
                    // Запуск таймера
                    this.startCountdown(player, this.config.escapeTime);
                }
            }
            
            // Очистка старых зон
            this.cleanupZones();
            
        }, 20); // Каждую секунду (20 тиков)
    }
    
    // ============================================
    // Очистка старых зон радиации
    // ============================================
    cleanupZones() {
        const now = Date.now();
        this.radiationZones = this.radiationZones.filter(zone => {
            const age = (now - zone.createTime) / 1000; // в секундах
            return age < zone.duration;
        });
    }
    
    // ============================================
    // Удаление всех зон радиации
    // ============================================
    clearAllZones() {
        this.radiationZones = [];
        world.sendMessage(` §7☢️ Все зоны радиации очищены.`);
    }
    
    // ============================================
    // Получение информации о зоне
    // ============================================
    getZoneInfo(x, y, z) {
        for (const zone of this.radiationZones) {
            const dx = x - zone.x;
            const dy = y - zone.y;
            const dz = z - zone.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance <= zone.radius) {
                return {
                    inZone: true,
                    zone: zone,
                    distance: distance,
                    intensity: zone.intensity * (1 - distance / zone.radius)
                };
            }
        }
        
        return { inZone: false };
    }
}

// ============================================
// Экспорт
// ============================================
export const radiationManager = new RadiationManager();