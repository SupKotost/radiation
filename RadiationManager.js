import { world, system } from "@minecraft/server";
import { RadiationConfig, levelForDose } from "../config/radiation_config.js";

/**
 * RadiationManager
 * ------------------------------------------------------------------
 * Единственный источник правды по радиации. Всё остальное (блоки, BoG,
 * будущие аномалии/мутанты) должно РЕГИСТРИРОВАТЬ источники здесь, а не
 * писать свою собственную логику накопления дозы.
 *
 * Производительность:
 *  - Источники хранятся в Map<dimensionId, Map<sourceId, source>>.
 *    Это разделение по измерениям - при пересчёте для игрока в Overworld
 *    мы даже не трогаем список источников Нижнего мира.
 *  - Пересчёт идёт не каждый тик, а раз в updateIntervalTicks
 *    (system.runInterval), и только для игроков, которые реально онлайн.
 *  - На каждого игрока проверяются только источники его измерения,
 *    и то с ранним выходом по distanceSquared, если игрок дальше
 *    maxSourceRadius по каждой из осей (дешёвая проверка перед sqrt).
 *  - Никакого перебора блоков мира и никакого сканирования чанков.
 *    Источники появляются/исчезают только через явные события
 *    (onPlace/onPlayerDestroy блока, вызов BoG-адаптера и т.д.)
 */
class RadiationManagerImpl {
  constructor() {
    /** @type {Map<string, Map<string, RadiationSource>>} */
    this.sourcesByDimension = new Map();

    /** @type {Map<string, {dose: number, level: string}>} кэш в памяти, зеркалит dynamic property */
    this.playerCache = new Map();

    this._tickHandle = null;
    this._decayHandle = null;
  }

  // ------------------------------------------------------------------
  // Жизненный цикл
  // ------------------------------------------------------------------

  start() {
    if (this._tickHandle !== null) return; // уже запущен
    this._tickHandle = system.runInterval(() => this._updatePlayers(), RadiationConfig.updateIntervalTicks);
    this._decayHandle = system.runInterval(() => this._decayAll(), RadiationConfig.decayIntervalTicks);
    this._log("RadiationManager started");
  }

  stop() {
    if (this._tickHandle !== null) system.clearRun(this._tickHandle);
    if (this._decayHandle !== null) system.clearRun(this._decayHandle);
    this._tickHandle = null;
    this._decayHandle = null;
  }

  // ------------------------------------------------------------------
  // Источники радиации (RadiationSource)
  // ------------------------------------------------------------------

  /**
   * Создаёт источник радиации.
   * @param {{id?: string, dimensionId: string, location: {x:number,y:number,z:number}, radius?: number, level?: number, falloff?: "linear"|"quadratic", meta?: object}} params
   * @returns {string} id источника (сгенерированный, если не передан)
   */
  createRadiationSource(params) {
    const id = params.id ?? `src_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const dimMap = this._dimMap(params.dimensionId);

    /** @type {RadiationSource} */
    const source = {
      id,
      dimensionId: params.dimensionId,
      location: { x: params.location.x, y: params.location.y, z: params.location.z },
      radius: params.radius ?? RadiationConfig.defaultSourceRadius,
      level: params.level ?? RadiationConfig.defaultSourceLevel,
      falloff: params.falloff ?? RadiationConfig.falloffCurve,
      meta: params.meta ?? {}
    };

    dimMap.set(id, source);
    this._log(`source created: ${id} @ ${source.dimensionId} r=${source.radius} lvl=${source.level}`);
    return id;
  }

  /**
   * Удаляет источник радиации по id.
   * @param {string} dimensionId
   * @param {string} id
   * @returns {boolean} true если источник существовал и был удалён
   */
  removeRadiationSource(dimensionId, id) {
    const dimMap = this.sourcesByDimension.get(dimensionId);
    if (!dimMap) return false;
    const existed = dimMap.delete(id);
    if (existed) this._log(`source removed: ${id} @ ${dimensionId}`);
    return existed;
  }

  /**
   * Возвращает список источников измерения (только для чтения - копии).
   * @param {string} dimensionId
   */
  listSources(dimensionId) {
    const dimMap = this.sourcesByDimension.get(dimensionId);
    return dimMap ? Array.from(dimMap.values()) : [];
  }

  // ------------------------------------------------------------------
  // Расчёт радиации в точке / у игрока
  // ------------------------------------------------------------------

  /**
   * Суммарная мощность радиации (RAD/сек) в точке, от всех источников измерения.
   * @param {string} dimensionId
   * @param {{x:number,y:number,z:number}} location
   */
  getRadiationAt(dimensionId, location) {
    const dimMap = this.sourcesByDimension.get(dimensionId);
    if (!dimMap || dimMap.size === 0) return 0;

    let total = 0;
    for (const source of dimMap.values()) {
      total += this._contribution(source, location);
    }
    return total;
  }

  /**
   * Текущая мощность радиации (RAD/сек) в позиции игрока.
   * @param {import("@minecraft/server").Player} player
   */
  getPlayerRadiation(player) {
    return this.getRadiationAt(player.dimension.id, player.location);
  }

  // ------------------------------------------------------------------
  // Доза игрока (RadiationDose)
  // ------------------------------------------------------------------

  /**
   * @param {import("@minecraft/server").Player} player
   * @returns {number}
   */
  getPlayerDose(player) {
    return this._readDose(player);
  }

  /**
   * @param {import("@minecraft/server").Player} player
   * @returns {string} SAFE|LOW|ELEVATED|DANGEROUS|CRITICAL|LETHAL
   */
  getPlayerLevel(player) {
    return levelForDose(this._readDose(player));
  }

  /**
   * Прибавляет дозу игроку (может быть отрицательным для лечения/антидотов).
   * @param {import("@minecraft/server").Player} player
   * @param {number} amount
   */
  addDose(player, amount) {
    const current = this._readDose(player);
    this.setDose(player, current + amount);
  }

  /**
   * Жёстко устанавливает дозу игрока.
   * @param {import("@minecraft/server").Player} player
   * @param {number} value
   */
  setDose(player, value) {
    const clamped = Math.max(0, Math.min(RadiationConfig.maxDose, value));
    player.setDynamicProperty(`${RadiationConfig.dynamicPropertyPrefix}dose`, clamped);
    this.playerCache.set(player.id, { dose: clamped, level: levelForDose(clamped) });
  }

  /**
   * Полностью сбрасывает дозу игрока в 0.
   * @param {import("@minecraft/server").Player} player
   */
  clearDose(player) {
    this.setDose(player, 0);
  }

  // ------------------------------------------------------------------
  // Внутреннее
  // ------------------------------------------------------------------

  _dimMap(dimensionId) {
    let dimMap = this.sourcesByDimension.get(dimensionId);
    if (!dimMap) {
      dimMap = new Map();
      this.sourcesByDimension.set(dimensionId, dimMap);
    }
    return dimMap;
  }

  _contribution(source, location) {
    const dx = source.location.x - location.x;
    const dy = source.location.y - location.y;
    const dz = source.location.z - location.z;

    // Дешёвая ранняя отсечка по расстоянию до sqrt.
    if (Math.abs(dx) > source.radius || Math.abs(dy) > source.radius || Math.abs(dz) > source.radius) {
      return 0;
    }

    const distSq = dx * dx + dy * dy + dz * dz;
    const radiusSq = source.radius * source.radius;
    if (distSq > radiusSq) return 0;

    const dist = Math.sqrt(distSq);
    const t = 1 - dist / source.radius; // 1 в эпицентре, 0 на границе

    if (source.falloff === "linear") {
      return source.level * t;
    }
    // quadratic (по умолчанию) - радиация падает быстрее у края, реалистичнее.
    return source.level * t * t;
  }

  _readDose(player) {
    const cached = this.playerCache.get(player.id);
    if (cached) return cached.dose;

    const stored = player.getDynamicProperty(`${RadiationConfig.dynamicPropertyPrefix}dose`);
    const dose = typeof stored === "number" ? stored : 0;
    this.playerCache.set(player.id, { dose, level: levelForDose(dose) });
    return dose;
  }

  _updatePlayers() {
    for (const player of world.getAllPlayers()) {
      const rad = this.getPlayerRadiation(player);
      if (rad > 0) {
        // RAD/сек * (интервал в тиках / 20 тиков-в-секунде)
        const gained = rad * (RadiationConfig.updateIntervalTicks / 20);
        this.addDose(player, gained);
      }
      this._applyLevelEffects(player);
    }
  }

  _decayAll() {
    for (const player of world.getAllPlayers()) {
      const rad = this.getPlayerRadiation(player);
      // Не лечим дозу, пока игрок стоит в активной радиационной зоне.
      if (rad > 0) continue;
      const current = this._readDose(player);
      if (current <= 0) continue;
      this.setDose(player, current - RadiationConfig.doseDecayPerInterval);
    }
  }

  _applyLevelEffects(player) {
    const level = this.getPlayerLevel(player);
    const effects = RadiationConfig.effectsByLevel[level];
    if (!effects) return;

    const state = this.playerCache.get(player.id);
    const tickCounter = (state.effectTick ?? 0) + 1;
    state.effectTick = tickCounter;

    for (const eff of effects) {
      if (tickCounter % eff.everyIntervals !== 0) continue;
      try {
        player.addEffect(eff.effect, eff.durationTicks, { amplifier: eff.amplifier, showParticles: false });
      } catch (e) {
        this._log(`failed to apply effect ${eff.effect}: ${e}`);
      }
    }
  }

  _log(msg) {
    if (RadiationConfig.debugLogging) console.warn(`[Radiation] ${msg}`);
  }
}

export const RadiationManager = new RadiationManagerImpl();

/**
 * @typedef {Object} RadiationSource
 * @property {string} id
 * @property {string} dimensionId
 * @property {{x:number,y:number,z:number}} location
 * @property {number} radius
 * @property {number} level
 * @property {"linear"|"quadratic"} falloff
 * @property {object} meta
 */
