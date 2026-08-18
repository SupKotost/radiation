import { RadiationManager } from "./RadiationManager.js";

/**
 * BoGCompatibility
 * ------------------------------------------------------------------
 * ВАЖНО: у нас нет файла Bombs of Glory (BoG patch 2.mcaddon), поэтому
 * его namespace, entity ID, item ID и внутренние события НЕ ИЗВЕСТНЫ
 * и НЕ ПРИДУМЫВАЮТСЯ.
 *
 * Этот модуль - только контракт (интерфейс), к которому в будущем
 * подключится реальная интеграция, когда .mcaddon BoG будет
 * предоставлен и проанализирован.
 *
 * Как это будет использоваться в будущем (ПРИМЕР, НЕ РЕАЛИЗАЦИЯ):
 *   BoGCompatibility.reportExplosion({
 *     dimensionId: "minecraft:overworld",
 *     location: { x, y, z },
 *     weaponType: "<реальный id из BoG>",
 *     yieldPower: <число>,
 *     blastRadius: <число>
 *   });
 * -> внутри создаст RadiationManager.createRadiationSource(...) с
 *    параметрами, выведенными из мощности взрыва.
 *
 * Сейчас метод существует, чётко типизирован в JSDoc, ничего не
 * взрывает и не хардкодит поведение BoG.
 */
class BoGCompatibilityAdapter {
  constructor() {
    /** @type {boolean} */
    this.enabled = false;
    /** @type {Map<string, string>} explosionEventKey -> radiation source id, для последующей очистки */
    this._activeBlastSources = new Map();
  }

  /**
   * Вызывается один раз при старте, если в будущем BoG будет обнаружен
   * (например по наличию его pack UUID среди зависимостей мира).
   * Пока просто помечает адаптер как неактивный.
   */
  initialize() {
    this.enabled = false;
    console.warn(
      "[Radiation][BoGCompatibility] BoG .mcaddon ещё не предоставлен. " +
        "Адаптер зарегистрирован, но неактивен."
    );
  }

  /**
   * Контракт для будущего вызова из реального обработчика событий BoG.
   * НЕ РЕАЛИЗОВАНО намеренно - выбрасывает ошибку, чтобы не создать
   * иллюзию рабочей интеграции.
   *
   * @param {{
   *   dimensionId: string,
   *   location: {x:number,y:number,z:number},
   *   weaponType: string,
   *   yieldPower: number,
   *   blastRadius: number
   * }} explosionInfo
   */
  reportExplosion(explosionInfo) {
    if (!this.enabled) {
      throw new Error(
        "[BoGCompatibility] Реальный API Bombs of Glory ещё не проанализирован. " +
          "Предоставьте .mcaddon BoG, чтобы реализовать эту интеграцию."
      );
    }
    // Намеренно не реализовано.
  }
}

export const BoGCompatibility = new BoGCompatibilityAdapter();
