const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

Hooks.once("init", () => {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "region-active-effects.statusEffect": StatusEffectRegionBehaviorType,
    "region-active-effects.statusEffectEvents": StatusEffectEventsRegionBehaviorType,
    "region-active-effects.activeEffect": ActiveEffectRegionBehaviorType,
    "region-active-effects.activeEffectEvents": ActiveEffectEventsRegionBehaviorType,
  });

  // add type icons
  Object.assign(CONFIG.RegionBehavior.typeIcons, {
    "region-active-effects.statusEffect": "fa-solid fa-person-burst",
    "region-active-effects.statusEffectEvents": "fa-solid fa-person-burst",
    "region-active-effects.activeEffect": "fa-solid fa-gears",
    "region-active-effects.activeEffectEvents": "fa-solid fa-gears",
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
      ],
      makeDefault: true,
    }
  );
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "region-active-effects",
    ActiveEffectEventsRegionBehaviorConfig,
    {
      types: ["region-active-effects.activeEffectEvents"],
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

/** The Region Events that operate on a token. */
const TOKEN_EVENTS = [
  CONST.REGION_EVENTS.TOKEN_ENTER,
  CONST.REGION_EVENTS.TOKEN_EXIT,
  CONST.REGION_EVENTS.TOKEN_MOVE,
  CONST.REGION_EVENTS.TOKEN_MOVE_IN,
  CONST.REGION_EVENTS.TOKEN_MOVE_OUT,
  CONST.REGION_EVENTS.TOKEN_PRE_MOVE,
  CONST.REGION_EVENTS.TOKEN_ROUND_END,
  CONST.REGION_EVENTS.TOKEN_ROUND_START,
  CONST.REGION_EVENTS.TOKEN_TURN_END,
  CONST.REGION_EVENTS.TOKEN_TURN_START,
];

/**
 * The data model for a behavior that applies a status effect while inside the Region.
 */
class StatusEffectRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.statusEffect"];

  static defineSchema() {
    return {
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: statusEffectChoices,
      }),
      overlay: new BooleanField({ initial: false }),
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

/**
 * The data model for a behavior that toggles, adds, or removes a status effect based on the subscribed event.
 */
class StatusEffectEventsRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.statusEffect", "RAE.TYPES.statusEffectEvents"];

  static defineSchema() {
    return {
      events: this._createEventsField({ events: TOKEN_EVENTS }),
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: statusEffectChoices,
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
      }),
      overlay: new BooleanField({ initial: false }),
    };
  }

  async _handleRegionEvent(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run once by active GM
    if (!game.users.activeGM?.isSelf) return;

    const active = this.action === "apply" ? true : this.action === "remove" ? false : undefined;
    actor.toggleStatusEffect(this.statusId, { active, overlay: this.overlay });
  }
}

async function applyEffectToActor(effect, actor, behavior) {
  // Enable an existing effect on the actor if it came from this behavior
  const existingEffect = actor.effects.find((e) => e.origin === behavior.uuid);
  if (existingEffect) {
    return existingEffect.update({ ...effect.constructor.getInitialDuration(), disabled: false });
  }

  // Create a new effect on the actor
  const effectData = {
    ...effect.toObject(),
    disabled: false,
    transfer: false,
    origin: behavior.uuid,
  };
  return ActiveEffect.implementation.create(effectData, { parent: actor });
}

/**
 * The data model for a behavior that adds an Active Effect while inside the Region.
 */
class ActiveEffectRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.activeEffect"];

  static defineSchema() {
    return {
      uuid: new DocumentUUIDField({ type: "ActiveEffect" }),
      disable: new BooleanField({ initial: false }),
    };
  }

  static async #onTokenEnter(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.uuid) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    const effect = await fromUuid(this.uuid);
    applyEffectToActor(effect, actor, this.behavior);
  }

  static async #onTokenExit(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.uuid) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    const existingEffect = actor.effects.find((e) => e.origin === this.behavior.uuid);
    if (existingEffect && this.disable) existingEffect.update({ disabled: true });
    else if (existingEffect) existingEffect.delete();
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit,
  };
}

/**
 * The data model for a behavior that can perform certain actions with active effects based on the subscribed event.
 */
class ActiveEffectEventsRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.activeEffect", "RAE.TYPES.activeEffectEvents"];

  static UUID_ACTIONS = ["add", "resetDuration"];
  static NAME_ACTIONS = ["enable", "disable", "delete"];

  static defineSchema() {
    return {
      events: this._createEventsField({ events: TOKEN_EVENTS }),
      action: new StringField({
        required: true,
        blank: false,
        nullable: true,
        choices: {
          add: "Add",
          resetDuration: "Reset Duration",
          enable: "Enable",
          disable: "Disable",
          delete: "Delete",
        },
      }),
      uuid: new DocumentUUIDField({ type: "ActiveEffect" }),
      name: new StringField({ required: false, blank: false, nullable: false }),
    };
  }

  static validateJoint(data) {
    if (ActiveEffectEventsRegionBehaviorType.UUID_ACTIONS.includes(data.action) && !data.uuid)
      throw new Error(`The uuid field is required for the ${data.action} action`);
    if (ActiveEffectEventsRegionBehaviorType.NAME_ACTIONS.includes(data.action) && !data.name)
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
        const effect = await fromUuid(this.uuid);
        applyEffectToActor(effect, actor, this.parent);
        break;
      case "resetDuration":
        this.#onResetDuration(actor);
        break;
      case "enable":
        this.#onEnableDisable(actor, false);
        break;
      case "disable":
        this.#onEnableDisable(actor, true);
        break;
      case "delete":
        const existingEffect = actor.effects.getName(this.name);
        if (existingEffect) await existingEffect.delete();
        break;
    }
  }

  async #onResetDuration(actor) {
    const effect = await fromUuid(this.uuid);
    const existingEffect = actor.effects.getName(effect.name);
    if (existingEffect)
      return existingEffect.update({ ...effect.constructor.getInitialDuration() });
  }

  async #onEnableDisable(actor, disabled) {
    const existingEffect = actor.effects.getName(this.name);
    if (existingEffect) return existingEffect.update({ disabled });
  }
}

/**
 * A custom sheet that hides/shows the uuid and name fields based on the action.
 */
class ActiveEffectEventsRegionBehaviorConfig extends foundry.applications.sheets
  .RegionBehaviorConfig {
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "form") {
      // Add change listener to action to hide/show other fields
      const action = htmlElement.querySelector("select[name='system.action']");
      action.addEventListener("change", this.#onActionChange.bind(this));
      // Set initial state of those fields
      this.#toggleVisibility(action);
    }
  }

  #onActionChange(event) {
    const target = event.target;
    this.#toggleVisibility(target);
  }

  #toggleVisibility(actionInput) {
    const fieldset = actionInput.closest("fieldset");
    const action = actionInput.value;

    let showUuid,
      showName = false;
    if (ActiveEffectEventsRegionBehaviorType.UUID_ACTIONS.includes(action)) showUuid = true;
    else if (ActiveEffectEventsRegionBehaviorType.NAME_ACTIONS.includes(action)) showName = true;

    const uuid = fieldset.querySelector("div.form-group:has([name='system.uuid'])");
    const name = fieldset.querySelector("div.form-group:has([name='system.name'])");

    function change(element, show) {
      if (show) element.classList.remove("hidden");
      else element.classList.add("hidden");
    }
    change(uuid, showUuid);
    change(name, showName);
  }
}
