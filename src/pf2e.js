import {
  BaseStatusRegionBehaviorType,
  BaseStatusEventsRegionBehaviorType,
  BaseEffectRegionBehaviorType,
  BaseEffectEventsRegionBehaviorType,
} from "./base.js";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

export function init() {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "region-active-effects.statusEffect": ConditionRegionBehaviorType,
    "region-active-effects.statusEffectEvents": ConditionEventsRegionBehaviorType,
    "region-active-effects.activeEffect": Pf2eEffectRegionBehaviorType,
    "region-active-effects.activeEffectEvents": Pf2eEffectEventsRegionBehaviorType,
  });

  // add type icons
  Object.assign(CONFIG.RegionBehavior.typeIcons, {
    "region-active-effects.statusEffect": CONFIG.Item.typeIcons.condition,
    "region-active-effects.statusEffectEvents": CONFIG.Item.typeIcons.condition,
    "region-active-effects.activeEffect": CONFIG.Item.typeIcons.effect,
    "region-active-effects.activeEffectEvents": CONFIG.Item.typeIcons.effect,
  });

  // change the type labels
  const prefix = "TYPES.RegionBehavior.pf2e";
  Object.assign(CONFIG.RegionBehavior.typeLabels, {
    "region-active-effects.statusEffect": `${prefix}.region-active-effects.statusEffect`,
    "region-active-effects.statusEffectEvents": `${prefix}.region-active-effects.statusEffectEvents`,
    "region-active-effects.activeEffect": `${prefix}.region-active-effects.activeEffect`,
    "region-active-effects.activeEffectEvents": `${prefix}.region-active-effects.activeEffectEvents`,
  });

  // register the Sheet
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "region-active-effects",
    foundry.applications.sheets.RegionBehaviorConfig,
    {
      types: [
        "region-active-effects.statusEffect",
        "region-active-effects.statusEffectEvents",
        "region-active-effects.activeEffect",
        "region-active-effects.activeEffectEvents",
      ],
      makeDefault: true,
    }
  );
}

function ConditionMixin(Base) {
  return class Condition extends Base {
    static _conditionChoices() {
      return game.pf2e.ConditionManager.conditionsSlugs.reduce((obj, c) => {
        obj[c] = `PF2E.condition.${c}.name`;
        return obj;
      }, {});
    }

    async _toggleStatus(actor, active) {
      // TODO soon, replace with: actor.toggleCondition(this.statusId, {active})

      if (active) await actor.increaseCondition(this.statusId);
      else if (active === false) await actor.decreaseCondition(this.statusId);
      else await actor.toggleCondition(this.statusId);
    }
  };
}

/**
 * The data model for a behavior that applies a Condition while inside the Region.
 */
class ConditionRegionBehaviorType extends ConditionMixin(BaseStatusRegionBehaviorType) {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "RAE.TYPES.pf2e-condition"];

  static defineSchema() {
    return {
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: this._conditionChoices,
      }),
    };
  }
}

class ConditionEventsRegionBehaviorType extends ConditionMixin(BaseStatusEventsRegionBehaviorType) {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "RAE.TYPES.pf2e-condition",
    "RAE.TYPES.pf2e-conditionEvents",
  ];

  static defineSchema() {
    return {
      events: this._createEventsField(),
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: this._conditionChoices,
      }),
      action: this._createActionField(),
    };
  }
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
