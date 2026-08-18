import { world } from "@minecraft/server";
import { RadiationManager } from "./RadiationManager.js";

/**
 * Commands
 * ------------------------------------------------------------------
 * Тестовые команды стадии 1. Реализованы через chatSend, а не через
 * /script custom commands, чтобы не тянуть за собой дополнительный
 * experimental toggle сверх "Beta APIs" уже нужного для блока.
 *
 * Использование в чате:
 *   !rad            - показать текущую радиацию/дозу/уровень
 *   !rad dose <n>   - установить дозу
 *   !rad add <n>    - прибавить дозу
 *   !rad clear      - сбросить дозу в 0
 *   !rad source add       - создать тестовый источник в позиции игрока
 *   !rad source remove    - удалить ближайший тестовый источник от игрока
 */
export function registerTestCommands() {
  world.beforeEvents.chatSend.subscribe((ev) => {
    const message = ev.message.trim();
    if (!message.startsWith("!rad")) return;

    ev.cancel = true; // не спамим общий чат
    const player = ev.sender;
    const args = message.split(/\s+/).slice(1);

    // Ответ выполняем в следующем тике, т.к. beforeEvents - read-only контекст.
    system_runNextTick(() => handle(player, args));
  });
}

function handle(player, args) {
  const [sub, a, b] = args;

  if (!sub) {
    const rad = RadiationManager.getPlayerRadiation(player);
    const dose = RadiationManager.getPlayerDose(player);
    const level = RadiationManager.getPlayerLevel(player);
    player.sendMessage(`§7RAD: §f${rad.toFixed(2)}/s §7| DOSE: §f${dose.toFixed(1)} §7| LEVEL: §f${level}`);
    return;
  }

  if (sub === "dose" && a !== undefined) {
    RadiationManager.setDose(player, Number(a));
    player.sendMessage(`§aDose set to ${a}`);
    return;
  }

  if (sub === "add" && a !== undefined) {
    RadiationManager.addDose(player, Number(a));
    player.sendMessage(`§aAdded ${a} dose`);
    return;
  }

  if (sub === "clear") {
    RadiationManager.clearDose(player);
    player.sendMessage("§aDose cleared");
    return;
  }

  if (sub === "source" && a === "add") {
    const id = RadiationManager.createRadiationSource({
      dimensionId: player.dimension.id,
      location: player.location
    });
    player.sendMessage(`§aTest source created: ${id}`);
    return;
  }

  if (sub === "source" && a === "remove") {
    const sources = RadiationManager.listSources(player.dimension.id);
    if (sources.length === 0) {
      player.sendMessage("§cNo sources in this dimension");
      return;
    }
    // Ближайший к игроку.
    let closest = sources[0];
    let closestDistSq = Infinity;
    for (const s of sources) {
      const dx = s.location.x - player.location.x;
      const dy = s.location.y - player.location.y;
      const dz = s.location.z - player.location.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closest = s;
      }
    }
    RadiationManager.removeRadiationSource(player.dimension.id, closest.id);
    player.sendMessage(`§aRemoved source: ${closest.id}`);
    return;
  }

  player.sendMessage("§cUsage: !rad | !rad dose <n> | !rad add <n> | !rad clear | !rad source add|remove");
}

// Небольшой хелпер, чтобы не импортировать system только ради одной отложенной задачи.
import { system } from "@minecraft/server";
function system_runNextTick(fn) {
  system.run(fn);
}
