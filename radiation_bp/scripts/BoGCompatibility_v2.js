// ============================================
// BoGCompatibility.js v2 - HARDCORE EDITION
// ============================================
// Совместимость с Bombs of Glory (BoG)
// Авто-создание зон радиации после ядерных взрывов
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager.js";

class BoGCompatibility {
    constructor() {
        // Настройки
        this.config = {
            // Включить ли совместимость с BoG
            enableBoGCompatibility: true,
            
            // Автоматически создавать зоны радиации после взрывов
            autoCreateFallout: true,
            
            // Множитель радиуса зоны заражения (от радиуса взрыва)
            falloutRadiusMultiplier: 1.5,
            
            // Интенсивность радиации (0-100)
            falloutIntensity: 80,
            
            // Длительность зоны (в секундах)
            falloutDuration: 600, // 10 минут
            
            // Сообщение в чат о взрыве
            enableExplosionMessage: true
        };
        
        // Типы бомб BoG и их параметры
        this.bombTypes = {
            "atomic": {
                name: "Атомная бомба",
                radius: 50,
                intensity: 60,
                duration: 300 // 5 минут
            },
            "thermonuclear": {
                name: "Термоядерная бомба",
                radius: 80,
                intensity: 70,
                duration: 450 // 7.5 минут
            },
            "apocalypse": {
                name: "Бомба Апокалипсиса",
                radius: 150,
                intensity: 90,
                duration: 600 // 10 минут
            },
            "doomsday": {
                name: "Бомба Судного Дня",
                radius: 250,
                intensity: 100,
                duration: 900 // 15 минут
            }
        };
        
        // Слушатель событий BoG
        this.startBoGListener();
    }
    
    // ============================================
    // Слушатель событий BoG
    // ============================================
    startBoGListener() {
        // Слушаем событие ядерного взрыва BoG
        // Примечание: BoG должен отправлять событие через world.sendMessage или custom events
        
        system.runInterval(() => {
            // Поиск игроков с эффектами от взрыва BoG
            const players = world.getAllPlayers();
            
            for (const player of players) {
                // Проверка: игрок получил урон от взрыва?
                // (здесь можно добавить проверку по эффектам или NBT)
                
                // Если игрок рядом с эпицентром взрыва BoG
                // Создаём зону радиации
            }
            
        }, 20); // Каждую секунду
    }
    
    // ============================================
    // Создание зоны радиации после взрыва BoG
    // ============================================
    createFalloutFromBoG(x, y, z, bombType = "atomic") {
        if (!this.config.enableBoGCompatibility) return;
        
        const bomb = this.bombTypes[bombType] || this.bombTypes.atomic;
        
        // Радиус зоны заражения
        const falloutRadius = bomb.radius * this.config.falloutRadiusMultiplier;
        
        // Интенсивность
        const intensity = bomb.intensity;
        
        // Длительность
        const duration = bomb.duration;
        
        // Создание зоны
        const zone = radiationManager.addZone(x, y, z, falloutRadius, intensity, duration);
        
        // Сообщение в чат
        if (this.config.enableExplosionMessage) {
            world.sendMessage(`\n §l §c☢️ ЯДЕРНЫЙ ВЗРЫВ! §r`);
            world.sendMessage(` §7Тип: §f${bomb.name} §r`);
            world.sendMessage(` §7Координаты: §f${x}, ${y}, ${z} §r`);
            world.sendMessage(` §7Радиус заражения: §c${falloutRadius} блоков §r`);
            world.sendMessage(` §eБЕГИТЕ ИЗ ЗОНЫ! §r\n`);
        }
        
        return zone;
    }
    
    // ============================================
    // Ручное создание зоны (команда)
    // ============================================
    manualCreateZone(x, y, z, bombType = "atomic") {
        return this.createFalloutFromBoG(x, y, z, bombType);
    }
    
    // ============================================
    // Получение информации о бомбе
    // ============================================
    getBombInfo(bombType) {
        const bomb = this.bombTypes[bombType];
        
        if (!bomb) {
            return {
                error: "Неизвестный тип бомбы",
                available: Object.keys(this.bombTypes)
            };
        }
        
        return {
            name: bomb.name,
            radius: bomb.radius,
            falloutRadius: bomb.radius * this.config.falloutRadiusMultiplier,
            intensity: bomb.intensity,
            duration: bomb.duration,
            durationMinutes: bomb.duration / 60
        };
    }
    
    // ============================================
    // Список всех типов бомб
    // ============================================
    listBombTypes() {
        const list = [];
        
        for (const [type, bomb] of Object.entries(this.bombTypes)) {
            list.push({
                type: type,
                name: bomb.name,
                radius: bomb.radius,
                falloutRadius: bomb.radius * this.config.falloutRadiusMultiplier,
                intensity: bomb.intensity,
                duration: `${bomb.duration / 60} мин`
            });
        }
        
        return list;
    }
}

// ============================================
// Экспорт
// ============================================
export const bogCompatibility = new BoGCompatibility();