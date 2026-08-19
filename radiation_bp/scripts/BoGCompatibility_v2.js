// ============================================
// BoGCompatibility.js v2 - HARDCORE EDITION
// ============================================
// Совместимость с:
// - Breakout: Containment (BoG)
// - Atomic Destruction: Nuclear Bombs (EL SANDO) - TNT ядерки 1-4 уровня
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager_v2.js";

class BoGCompatibility {
    constructor() {
        this.config = {
            enableBoGCompatibility: true,
            enableAtomicDestructionCompatibility: true,
            radiationDamageMultiplier: 1.0,
            // Радиация от ядерок Atomic Destruction (TNT 1-4)
            nukeRadiationByTier: {
                1: 25,  // TNT ядерка 1 уровня = +25% радиации
                2: 50,  // TNT ядерка 2 уровня = +50% радиации
                3: 75,  // TNT ядерка 3 уровня = +75% радиации
                4: 100  // TNT ядерка 4 уровня = +100% радиации (смерть!)
            }
        };
        this.initialize();
    }
    
    initialize() {
        if (!this.config.enableBoGCompatibility && !this.config.enableAtomicDestructionCompatibility) return;
        
        system.runInterval(() => {
            const players = world.getAllPlayers();
            
            for (const player of players) {
                const data = radiationManager.playerRadiation.get(player.id);
                
                if (data && data.level > 0) {
                    const damage = (data.level / 100) * this.config.radiationDamageMultiplier;
                    
                    if (data.level >= 100 && data.countdownTimer === 0) {
                        player.kill();
                    } else if (data.level >= 80) {
                        player.applyDamage(damage, {
                            cause: "magic",
                            damageSource: {
                                cause: "magic",
                                initiatingEntity: player
                            }
                        });
                    }
                }
            }
            
        }, 20);
    }
    
    /**
     * Применяет радиацию от взрыва ядерки Atomic Destruction
     * @param {Player} player - Игрок
     * @param {number} nukeTier - Уровень ядерки (1-4)
     * @param {number} distance - Расстояние от взрыва в блоках
     */
    applyNukeRadiation(player, nukeTier, distance = 0) {
        if (!this.config.enableAtomicDestructionCompatibility) return;
        
        const baseRadiation = this.config.nukeRadiationByTier[nukeTier] || 0;
        if (baseRadiation === 0) return;
        
        // Уменьшаем радиацию с расстоянием (каждые 10 блоков = -10% радиации)
        const distanceReduction = Math.min(0.9, distance / 100);
        const finalRadiation = baseRadiation * (1 - distanceReduction);
        
        const currentData = radiationManager.playerRadiation.get(player.id);
        const currentLevel = currentData?.level || 0;
        const newLevel = Math.min(100, currentLevel + finalRadiation);
        
        radiationManager.setRadiationLevel(player, newLevel);
        
        // Сообщение игроку
        if (distance < 20) {
            player.sendMessage(` §c☢️ ВЫ ПОПАЛИ ПОД ВЗРЫВ ЯДЕРКИ ${nukeTier} УРОВНЯ! §r`);
            player.sendMessage(` §7Радиация: +${Math.round(finalRadiation)}% §r`);
        }
    }
    
    /**
     * Проверяет, была ли ядерка Atomic Destruction взорвана рядом с игроком
     * Можно вызывать из других модов через события
     */
    onNukeExplosion(nukeTier, explosionLocation, affectedPlayers) {
        if (!this.config.enableAtomicDestructionCompatibility) return;
        
        for (const player of affectedPlayers) {
            const distance = Math.sqrt(
                Math.pow(player.location.x - explosionLocation.x, 2) +
                Math.pow(player.location.y - explosionLocation.y, 2) +
                Math.pow(player.location.z - explosionLocation.z, 2)
            );
            
            this.applyNukeRadiation(player, nukeTier, distance);
        }
    }
}

export const boGCompatibility = new BoGCompatibility();
