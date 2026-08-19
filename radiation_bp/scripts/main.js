// ============================================
// main.js - HARDCORE EDITION
// ============================================
// Инициализация всех модулей системы радиации
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager.js";
import { hudManager } from "./HUD.js";
import { commandManager } from "./Commands.js";
import { bogCompatibility } from "./BoGCompatibility.js";

// ============================================
// Логирование запуска
// ============================================

world.sendMessage(" §l §a☢️ RADIATION V2 - HARDCORE EDITION §r");
world.sendMessage(" §7Запуск системы радиации... §r");
world.sendMessage(" §7Все на равных: кто не сьебал за 30 секунд — тому пизда! §r");
world.sendMessage(" §aСистема готова! §r");

// ============================================
// Экспорт (если нужно)
// ============================================
export { radiationManager, hudManager, commandManager, bogCompatibility };
