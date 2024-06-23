const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, StringField } = foundry.data.fields;

Hooks.once("init", () => {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "region-active-effects.statusEffect": StatusEffectRegionBehaviorType,
    "region-active-effects.statusEffectEvents": StatusEffectEventsRegionBehaviorType,
  });

  // register the Sheet
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "region-active-effects",
    foundry.applications.sheets.RegionBehaviorConfig,
    {
      types: ["region-active-effects.statusEffect", "region-active-effects.statusEffectEvents"],
      makeDefault: true,
    }
  );
});

function statusEffectChoices() {
  return CONFIG.statusEffects.reduce((obj, statusEffect) => {
    obj[statusEffect.id] = statusEffect.name;
    return obj;
  }, {});
}

/**
 * The data model for a behavior that applies a status effect while inside the Region.
 */
class StatusEffectRegionBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: statusEffectChoices,
        label: "RAE.TYPES.statusEffect.FIELDS.statusId.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.statusId.hint",
      }),
      overlay: new BooleanField({
        initial: false,
        label: "RAE.TYPES.statusEffect.FIELDS.overlay.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.overlay.hint",
      }),
    };
  }

  static async #onTokenEnter(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    actor.toggleStatusEffect(this.statusId, { active: true, overlay: this.overlay });
  }

  static async #onTokenExit(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    actor.toggleStatusEffect(this.statusId, { active: false });
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit,
  };
}

class StatusEffectEventsRegionBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      events: this._createEventsField(),
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: statusEffectChoices,
        label: "RAE.TYPES.statusEffect.FIELDS.statusId.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.statusId.hint",
      }),
      action: new StringField({
        required: true,
        blank: false,
        nullable: false,
        initial: "toggle",
        choices: {
          toggle: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.toggle",
          apply: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.apply",
          remove: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.remove",
        },
        label: "RAE.TYPES.statusEffectEvents.FIELDS.action.label",
        hint: "RAE.TYPES.statusEffectEvents.FIELDS.action.hint",
      }),
      overlay: new BooleanField({
        initial: false,
        label: "RAE.TYPES.statusEffect.FIELDS.overlay.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.overlay.hint",
      }),
    };
  }

  async _handleRegionEvent(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    const active = this.action === "apply" ? true : this.action === "remove" ? false : undefined;
    actor.toggleStatusEffect(this.statusId, { active, overlay: this.overlay });
  }
}
