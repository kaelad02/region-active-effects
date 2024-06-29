const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { StringField } = foundry.data.fields;

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

/*****************
 * Status Effects
 ****************/

/**
 * The base class for the `statusEffect` Region Behavior. To use it as a Region Behavior, extend the class and add
 * the `static defineSchema` and `_toggleStatus` functions.
 */
export class BaseStatusRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.statusEffect"];

  static async #onTokenEnter(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    this._toggleStatus(actor, true);
  }

  static async #onTokenExit(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    this._toggleStatus(actor, false);
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit,
  };
}

/**
 * The base class for the `statusEffectEvents` Region Behavior. To use it as a Region Behavior, extend the class and add
 * the `static defineSchema` and `_toggleStatus` functions.
 */
export class BaseStatusEventsRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.statusEffect", "RAE.TYPES.statusEffectEvents"];

  static _createEventsField() {
    return super._createEventsField({ events: TOKEN_EVENTS });
  }

  static _createActionField() {
    return new StringField({
      required: true,
      blank: false,
      nullable: false,
      initial: "toggle",
      choices: {
        toggle: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.toggle",
        apply: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.apply",
        remove: "RAE.TYPES.statusEffectEvents.FIELDS.action.choices.remove",
      },
    });
  }

  async _handleRegionEvent(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run once by active GM
    if (!game.users.activeGM?.isSelf) return;

    const active = this.action === "apply" ? true : this.action === "remove" ? false : undefined;
    this._toggleStatus(actor, active);
  }
}

/*****************
 * Active Effects
 ****************/

/**
 * The base class for the `activeEffect` Region Behavior. To use it as a Region Behavior, extend the class and add
 * the `static defineSchema`, `_addEffect`, and `_deleteEffect` functions.
 */
export class BaseEffectRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.activeEffect"];

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
 * The base class for the `activeEffectEvents` Region Behavior. To use it as a Region Behavior, extend the class and add
 * the  `static defineSchema` function. And depending on which actions are supported, add the
 * `_addEffect`, `_resetDuration`, `_enableOrDisable`, and `_deleteEffect` functions.
 */
export class BaseEffectEventsRegionBehaviorType extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["RAE.TYPES.activeEffect", "RAE.TYPES.activeEffectEvents"];

  static ALL_ACTIONS = ["add", "resetDuration", "enable", "disable", "delete"];

  static _createEventsField() {
    return super._createEventsField({ events: TOKEN_EVENTS });
  }

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
