import {
  BaseStatusRegionBehaviorType,
  BaseStatusEventsRegionBehaviorType,
  BaseEffectRegionBehaviorType,
  BaseEffectEventsRegionBehaviorType,
} from "./base.js";

const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

export function init() {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "region-active-effects.statusEffect": StatusRegionBehaviorType,
    "region-active-effects.statusEffectEvents": StatusEventsRegionBehaviorType,
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
}

/*****************
 * Status Effects
 ****************/

function StatusMixin(Base) {
  return class Status extends Base {
    static _statusChoices() {
      return CONFIG.statusEffects.reduce((obj, statusEffect) => {
        obj[statusEffect.id] = statusEffect.name;
        return obj;
      }, {});
    }

    async _toggleStatus(actor, active) {
      actor.toggleStatusEffect(this.statusId, { active, overlay: this.overlay });
    }
  };
}

/**
 * The data model for a behavior that applies a status effect while inside the Region.
 */
class StatusRegionBehaviorType extends StatusMixin(BaseStatusRegionBehaviorType) {
  static defineSchema() {
    return {
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: this._statusChoices,
      }),
      overlay: new BooleanField({ initial: false }),
    };
  }
}

/**
 * The data model for a behavior that toggles, adds, or removes a status effect based on the subscribed event.
 */
class StatusEventsRegionBehaviorType extends StatusMixin(BaseStatusEventsRegionBehaviorType) {
  static defineSchema() {
    return {
      events: this._createEventsField(),
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        choices: this._statusChoices,
      }),
      action: this._createActionField(),
      overlay: new BooleanField({ initial: false }),
    };
  }
}

/*****************
 * Active Effects
 ****************/

function ActiveEffectMixin(Base) {
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
      const effect = await fromUuid(this.uuid);
      const existingEffect = actor.effects.getName(effect.name);
      if (existingEffect) return existingEffect.update({ disabled });
    }

    async _deleteEffect(actor) {
      const effect = await fromUuid(this.uuid);
      const existingEffect = actor.effects.getName(effect.name);
      if (existingEffect) return existingEffect.delete();
    }
  };
}

/**
 * The data model for a behavior that adds an Active Effect while inside the Region.
 */
class ActiveEffectRegionBehaviorType extends ActiveEffectMixin(BaseEffectRegionBehaviorType) {
  static defineSchema() {
    return {
      uuid: new DocumentUUIDField({ type: "ActiveEffect" }),
      disable: new BooleanField({ initial: false }),
    };
  }
}

/**
 * The data model for a behavior that can perform certain actions with active effects based on the subscribed event.
 */
class ActiveEffectEventsRegionBehaviorType extends ActiveEffectMixin(
  BaseEffectEventsRegionBehaviorType
) {
  static defineSchema() {
    return {
      events: this._createEventsField(),
      action: this._createActionField(),
      uuid: new DocumentUUIDField({ type: "ActiveEffect" })
    };
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
