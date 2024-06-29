const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

/**
 * The base class for the `activeEffect` Region Behavior.
 */
class BaseEffectRegionBehaviorType extends RegionBehaviorType {
  static async #onTokenEnter(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.uuid) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    this._addEffect(actor);
  }

  static async #onTokenExit(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.uuid) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    if (this.disable) this._enableOrDisable(actor, true);
    else this._deleteEffect(actor);
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit,
  };
}

/**
 * The base class for the `activeEffectEvents` Region Behavior.
 */
class BaseEffectEventsRegionBehaviorType extends RegionBehaviorType {
  static ALL_ACTIONS = ["add", "resetDuration", "enable", "disable", "delete"];
  static UUID_ACTIONS = ["add", "resetDuration"];
  static NAME_ACTIONS = ["enable", "disable", "delete"];

  static _createActionField({ actions } = {}) {
    return new StringField({
      required: true,
      blank: false,
      nullable: true,
      choices: this.ALL_ACTIONS.reduce((obj, a) => {
        if (actions && !actions.includes(a)) return obj;
        obj[a] = `RAE.ACTIONS.${a}.label`;
        return obj;
      }, {}),
    });
  }

  static validateJoint(data) {
    if (this.UUID_ACTIONS.includes(data.action) && !data.uuid)
      throw new Error(`The uuid field is required for the ${data.action} action`);
    if (this.NAME_ACTIONS.includes(data.action) && !data.name)
      throw new Error(`The name field is required for the ${data.action} action`);
  }

  async _handleRegionEvent(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor) return;

    // only run once by active GM
    if (!game.users.activeGM?.isSelf) return;

    switch (this.action) {
      case "add":
        this._addEffect(actor);
        break;
      case "resetDuration":
        this._resetDuration(actor);
        break;
      case "enable":
        this._enableOrDisable(actor, false);
        break;
      case "disable":
        this._enableOrDisable(actor, true);
        break;
      case "delete":
        this._deleteEffect(actor);
        break;
    }
  }
}

/**
 * The data model for a PF2e-specific behavior that adds an Effect item while inside the Region.
 */
class Pf2eEffectRegionBehaviorType extends Pf2eEffectMixin(BaseEffectRegionBehaviorType) {
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

/**
 * A mixin for the Active Effect behaviors based on core Foundry's handling of Active Effects.
 */
function CoreEffectMixin(Base) {
  return class BaseEffect extends Base {
    async _addEffect(actor) {
      const effect = await fromUuid(this.uuid);
      const origin = this.parent.uuid;

      // Enable an existing effect on the actor if it came from this behavior
      const existingEffect = actor.effects.find((e) => e.origin === origin);
      if (existingEffect)
        return existingEffect.update({
          ...effect.constructor.getInitialDuration(),
          disabled: false,
        });

      // Create a new effect on the actor
      const effectData = {
        ...effect.toObject(),
        disabled: false,
        transfer: false,
        origin,
      };
      return ActiveEffect.implementation.create(effectData, { parent: actor });
    }

    async _resetDuration(actor) {
      const effect = await fromUuid(this.uuid);
      const existingEffect = actor.effects.getName(effect.name);
      if (existingEffect)
        return existingEffect.update({ ...effect.constructor.getInitialDuration() });
    }

    async _enableOrDisable(actor, disabled) {
      const existingEffect = actor.effects.getName(this.name);
      if (existingEffect) return existingEffect.update({ disabled });
    }

    async _deleteEffect(actor) {
      // find name
      let name = this.name;
      if (!name && this.uuid) {
        const effect = await fromUuid(this.uuid);
        name = effect.name;
      }
      // get effect and delete it
      const existingEffect = actor.effects.getName(name);
      if (existingEffect) await existingEffect.delete();
    }
  };
}
