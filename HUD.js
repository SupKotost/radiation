import { world, system } from "@minecraft/server";
import { RadiationConfig } from "../config/radiation_config.js";
import { RadiationManager } from "./RadiationManager.js";

/**
 * HUD
 * ------------------------------------------------------------------
 * Тестовый HUD стадии 1. Использует onScreenDisplay.setActionBar,
 * чтобы не плодить дополнительные UI-формы/scoreboard без необходимости.
 * Обновляется по интервалу (не каждый тик).
 */
class HUDImpl {
  start() {
    if (this._handle !== undefined) return;
    this._handle = system.runInterval(() => this._render(), RadiationConfig.hudIntervalTicks);
  }

  stop() {
    if (this._handle !== undefined) system.clearRun(this._handle);
    this._handle = undefined;
  }

  _render() {
    for (const player of world.getAllPlayers()) {
      const rad = RadiationManager.getPlayerRadiation(player);
      const dose = RadiationManager.getPlayerDose(player);
      const level = RadiationManager.getPlayerLevel(player);

      const text = `§7RAD: §f${rad.toFixed(2)}/s  §7DOSE: §f${dose.toFixed(1)}  §7LEVEL: ${this._colorFor(level)}${level}`;
      player.onScreenDisplay.setActionBar(text);
    }
  }

  _colorFor(level) {
    switch (level) {
      case "SAFE":
        return "§a";
      case "LOW":
        return "§e";
      case "ELEVATED":
        return "§6";
      case "DANGEROUS":
        return "§c";
      case "CRITICAL":
        return "§4";
      case "LETHAL":
        return "§5";
      default:
        return "§f";
    }
  }
}

export const HUD = new HUDImpl();
