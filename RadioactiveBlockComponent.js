import { system } from "@minecraft/server";
import { RadiationConfig } from "../config/radiation_config.js";
import { RadiationManager } from "./RadiationManager.js";

const COMPONENT_ID = "rad:radioactive_source";

/**
 * Ключ источника для конкретного блока - завязан на координаты, а не
 * на случайный id, потому что источники создаются заново из фактически
 * стоящих блоков (через onPlace), а не восстанавливаются из отдельного
 * сохранённого списка.
 */
function sourceIdForBlock(location) {
  return `block_${location.x}_${location.y}_${location.z}`;
}

/**
 * Регистрирует custom block component "rad:radioactive_source".
 *
 * ВАЖНО: custom block components требуют:
 *  - @minecraft/server версии 2.0.0+;
 *  - format_version блока 1.21.90+ (см. blocks/radioactive_ore.json);
 *  - включённого экспериментального переключателя "Beta APIs"
 *    в настройках создаваемого мира.
 */
export function registerRadioactiveBlockComponent() {
  system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
      onPlace(e) {
        const { block, dimension } = e;
        RadiationManager.createRadiationSource({
          id: sourceIdForBlock(block.location),
          dimensionId: dimension.id,
          location: block.location,
          radius: RadiationConfig.defaultSourceRadius,
          level: RadiationConfig.defaultSourceLevel,
          meta: { origin: "block", blockType: "rad:radioactive_ore" }
        });
      },

      // Вызывается, когда игрок ломает блок.
      onPlayerBreak(e) {
        const { block, dimension } = e;
        RadiationManager.removeRadiationSource(dimension.id, sourceIdForBlock(block.location));
      }
    });
  });
}
