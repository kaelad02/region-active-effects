import { BaseEffectRegionBehaviorType, BaseEffectEventsRegionBehaviorType } from "./base.js";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

export function init() {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    //"region-active-effects.statusEffect": StatusEffectRegionBehaviorType,
    //"region-active-effects.statusEffectEvents": StatusEffectEventsRegionBehaviorType,
    "region-active-effects.activeEffect": Pf2eEffectRegionBehaviorType,
    "region-active-effects.activeEffectEvents": Pf2eEffectEventsRegionBehaviorType,
  });

  // add type icons
  Object.assign(CONFIG.RegionBehavior.typeIcons, {
    //"region-active-effects.statusEffect": "fa-solid fa-person-burst",
    //"region-active-effects.statusEffectEvents": "fa-solid fa-person-burst",
    "region-active-effects.activeEffect": CONFIG.Item.typeIcons.effect,
    "region-active-effects.activeEffectEvents": CONFIG.Item.typeIcons.effect,
  });

  // register the Sheet
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "region-active-effects",
    foundry.applications.sheets.RegionBehaviorConfig,
    {
      types: [
        //"region-active-effects.statusEffect",
        //"region-active-effects.statusEffectEvents",
        "region-active-effects.activeEffect",
        "region-active-effects.activeEffectEvents",
      ],
      makeDefault: true,
    }
  );
}

/**
 * The data model for a PF2e-specific behavior that adds an Effect item while inside the Region.
 */
class Pf2eEffectRegionBehaviorType extends Pf2eEffectMixin(BaseEffectRegionBehaviorType) {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "RAE.TYPES.pf2e-effect"];

  static defineSchema() {
    return {
      uuid: new DocumentUUIDField({
        type: "Item",
        validate: this.validateItemType,
      }),
    };
  }
}

/**
 * The data model for a PF2e-specific behavior that performs actions with an Effect item wbased on the subscribed event.
 */
class Pf2eEffectEventsRegionBehaviorType extends Pf2eEffectMixin(
  BaseEffectEventsRegionBehaviorType
) {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "RAE.TYPES.pf2e-effect",
    "RAE.TYPES.pf2e-effectEvents",
  ];

  static defineSchema() {
    return {
      events: this._createEventsField(),
      action: this._createActionField({ actions: ["add", "delete"] }),
      uuid: new DocumentUUIDField({
        type: "Item",
        validate: this.validateItemType,
      }),
    };
  }
}

/**
 * A mixin for the Active Effect behaviors based on PF2e's Effect item type.
 */
function Pf2eEffectMixin(Base) {
  return class Pf2eEffect extends Base {
    /**
     * Helper function to validate the
     */
    static validateItemType(value, options) {
      const doc = fromUuidSync(value);
      if (doc.type !== "effect") throw new Error("The Item type must be Effect");
    }

    async _addEffect(actor) {
      const effect = await fromUuid(this.uuid);
      const source = effect.toObject();
      // TODO should I add my own flag to replicate origin on the active effect?
      source.flags = foundry.utils.mergeObject(source.flags ?? {}, {
        core: { sourceId: this.uuid },
      });

      const existing = actor.itemTypes.effect.find((e) => e.flags.core?.sourceId === this.uuid);
      if (!existing) await actor.createEmbeddedDocuments("Item", [source]);
    }

    async _deleteEffect(actor) {
      const existingEffect = actor.itemTypes.effect.find(
        (e) => e.flags.core?.sourceId === this.uuid
      );
      if (existingEffect) await existingEffect.delete();
    }
  };
}
