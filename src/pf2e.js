import { BaseEffectRegionBehaviorType } from "base.js";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

/**
 * The data model for a PF2e-specific behavior that adds an Effect item while inside the Region.
 */
export class Pf2eEffectRegionBehaviorType extends Pf2eEffectMixin(BaseEffectRegionBehaviorType) {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.pf2e-effect"];

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
      const existingEffect = actor.itemTypes.effect.find((e) => e.flags.core?.sourceId === uuid);
      if (existingEffect) await existingEffect.delete();
    }
  };
}
