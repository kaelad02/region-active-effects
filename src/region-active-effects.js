const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, StringField } = foundry.data.fields;

Hooks.once("init", () => {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "region-active-effects.statusEffect": StatusEffectRegionBehaviorType,
  });

  // register the Sheet
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "region-active-effects",
    foundry.applications.sheets.RegionBehaviorConfig,
    {
      types: ["region-active-effects.statusEffect"],
      makeDefault: true,
    }
  );
});

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
        // TODO sort choices by label
        choices: CONFIG.statusEffects.reduce((obj, statusEffect) => {
          obj[statusEffect.id] = statusEffect.name;
          return obj;
        }, {}),
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
