// ============================================
// main.js - HARDCORE EDITION
// ============================================

import { world, system } from "@minecraft/server";
import { radiationManager } from "./RadiationManager_v2.js";
import { hudManager } from "./HUD_v2.js";
import { commandManager } from "./Commands_v2.js";
import { bogCompatibility } from "./BoGCompatibility_v2.js";

world.sendMessage(" §l §a☢️ RADIATION V2 - HARDCORE EDITION §r");
world.sendMessage(" §7Запуск системы радиации... §r");
world.sendMessage(" §7Все на равных: кто не сьебал за 30 секунд — тому пизда! §r");
world.sendMessage(" §aСистема готова! §r");

export { radiationManager, hudManager, commandManager, bogCompatibility };
